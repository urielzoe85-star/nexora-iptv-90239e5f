// HMAC helpers shared by every inbound webhook. The SebPay route uses
// its own inline verification today and stays unchanged — these helpers
// are for future connectors so we don't reinvent timing-safe compare.
//
// Web Crypto keeps this shared helper isomorphic when the integration-hub
// barrel is reachable from both server functions and browser modules.

export async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyHmac(secret: string, body: string, signatureHex: string): Promise<boolean> {
  const expected = (await hmacHex(secret, body)).toLowerCase();
  const provided = signatureHex.trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < provided.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}