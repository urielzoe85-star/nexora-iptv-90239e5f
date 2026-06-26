// HMAC helpers shared by every inbound webhook. The SebPay route uses
// its own inline verification today and stays unchanged — these helpers
// are for future connectors so we don't reinvent timing-safe compare.

import { createHmac, timingSafeEqual } from "crypto";

export function hmacHex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyHmac(secret: string, body: string, signatureHex: string): boolean {
  const expected = hmacHex(secret, body).toLowerCase();
  const provided = signatureHex.trim().toLowerCase();
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}