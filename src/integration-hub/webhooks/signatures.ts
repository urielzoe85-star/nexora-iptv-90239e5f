// HMAC helpers shared by every inbound webhook. The SebPay route uses
// its own inline verification today and stays unchanged — these helpers
// are for future connectors so we don't reinvent timing-safe compare.
//
// Node's `crypto` module is loaded lazily via dynamic import so this
// file stays safe when it transits through the client bundle graph
// (e.g. via `@/integration-hub` barrel imports in `.functions.ts`
// modules). Vite would otherwise externalize `crypto` to a browser
// stub and fail the production build with:
//   "createHmac" is not exported by "__vite-browser-external".

type NodeCrypto = typeof import("node:crypto");
let _cryptoPromise: Promise<NodeCrypto> | null = null;
function loadNodeCrypto(): Promise<NodeCrypto> {
  if (!_cryptoPromise) _cryptoPromise = import("node:crypto");
  return _cryptoPromise;
}

export async function hmacHex(secret: string, body: string): Promise<string> {
  const { createHmac } = await loadNodeCrypto();
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function verifyHmac(secret: string, body: string, signatureHex: string): Promise<boolean> {
  const { timingSafeEqual } = await loadNodeCrypto();
  const expected = (await hmacHex(secret, body)).toLowerCase();
  const provided = signatureHex.trim().toLowerCase();
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}