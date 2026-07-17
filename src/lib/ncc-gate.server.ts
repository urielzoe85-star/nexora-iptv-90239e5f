// NCC second-factor gate — server-side.
// Issues and verifies a short-lived HMAC-signed cookie bound to the admin
// user id. The cookie is HttpOnly so it cannot be forged from the browser
// (unlike the previous sessionStorage flag). Signed with a dedicated
// server-only secret (`NCC_GATE_SECRET`) — falls back to
// `SUPABASE_SERVICE_ROLE_KEY` when the dedicated secret is not configured
// so existing deployments keep working; both are server-only.

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ncc_gate";
// 8 hours — matches a working shift, forces a re-check for long sessions.
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function gateSecret(): string {
  const s = process.env.NCC_GATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("NCC gate secret is not configured (NCC_GATE_SECRET).");
  return s;
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", gateSecret()).update(payload).digest());
}

export function issueNccToken(userId: string, ttlSeconds = DEFAULT_TTL_SECONDS): {
  token: string;
  expiresAt: number;
} {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = b64url(Buffer.from(JSON.stringify({ uid: userId, exp }), "utf8"));
  const sig = sign(body);
  return { token: `${body}.${sig}`, expiresAt: exp };
}

export function verifyNccToken(token: string | undefined | null, userId: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  let expected: string;
  try { expected = sign(body); } catch { return false; }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const decoded = JSON.parse(b64urlDecode(body).toString("utf8")) as { uid?: string; exp?: number };
    if (!decoded.uid || decoded.uid !== userId) return false;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function setNccGateCookie(userId: string): Promise<{ expiresAt: number }> {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  const { token, expiresAt } = issueNccToken(userId);
  // SameSite=None + Partitioned so the cookie is accepted in cross-site
  // iframes (Lovable preview) as well as the top-level published site.
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    `Max-Age=${DEFAULT_TTL_SECONDS}`,
  ].join("; ");
  setResponseHeader("set-cookie", cookie);
  return { expiresAt };
}

export async function clearNccGateCookie(): Promise<void> {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader(
    "set-cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`,
  );
}

export async function readNccGateCookie(): Promise<string | undefined> {
  const { getCookie } = await import("@tanstack/react-start/server");
  return getCookie(COOKIE_NAME);
}

export const NCC_GATE_COOKIE_NAME = COOKIE_NAME;
