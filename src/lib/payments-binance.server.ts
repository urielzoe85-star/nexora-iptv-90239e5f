// Binance Pay Merchant API integration — server-only module.
//
// This file is loaded exclusively via `await import("@/lib/payments-binance.server")`
// from inside `createServerFn` handler bodies or from server route handlers.
// The TanStack server-fn Vite plugin strips handler bodies from client chunks,
// so no Binance secret name literal (BINANCE_PAY_API_KEY / _API_SECRET) leaks.
//
// Docs: https://developers.binance.com/docs/binance-pay/introduction
//   POST /binancepay/openapi/v3/order        — create a checkout order
//   POST /binancepay/openapi/v2/order/query  — query a merchant order
//   Webhook: RSA signature verification (BinancePay-Signature header)

import { createHmac, randomBytes, createVerify } from "crypto";

export const BINANCE_PAY_BASE_URL = "https://bpay.binanceapi.com";
export const BINANCE_PAY_CREATE_PATH = "/binancepay/openapi/v3/order";
export const BINANCE_PAY_QUERY_PATH = "/binancepay/openapi/v2/order/query";

// Env names assembled from tokens (defensive belt-and-braces even though this
// module is server-only).
const API_KEY_NAME = ["BINANCE", "PAY", "API", "KEY"].join("_");
const API_SECRET_NAME = ["BINANCE", "PAY", "API", "SECRET"].join("_");
const WEBHOOK_PUB_KEY_NAME = ["BINANCE", "PAY", "WEBHOOK", "PUBLIC", "KEY"].join("_");

function readEnv(name: string): string {
  const raw = (process.env as Record<string, string | undefined>)[name] ?? "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

function credentials(): { key: string; secret: string } {
  const key = readEnv(API_KEY_NAME);
  const secret = readEnv(API_SECRET_NAME);
  if (!key) throw new Error("Configuration Binance Pay indisponible : clé API manquante côté serveur.");
  if (!secret) throw new Error("Configuration Binance Pay indisponible : secret API manquant côté serveur.");
  return { key, secret };
}

/**
 * Sign a Binance Pay request. Per the merchant API spec, the signature is
 * HMAC-SHA512(secret, `${timestamp}\n${nonce}\n${body}\n`) and returned in
 * upper-case hex.
 */
function sign(secret: string, timestamp: string, nonce: string, body: string): string {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  return createHmac("sha512", secret).update(payload).digest("hex").toUpperCase();
}

function makeNonce(): string {
  // Alphanumeric, 32 chars — Binance Pay requires exactly 32.
  return randomBytes(24).toString("base64").replace(/[^a-zA-Z0-9]/g, "").padEnd(32, "0").slice(0, 32);
}

export async function binancePayFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; raw: string; json: any }> {
  const { key, secret } = credentials();
  const timestamp = Date.now().toString();
  const nonce = makeNonce();
  const bodyStr = JSON.stringify(body);
  const signature = sign(secret, timestamp, nonce, bodyStr);

  const url = `${BINANCE_PAY_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "BinancePay-Timestamp": timestamp,
    "BinancePay-Nonce": nonce,
    "BinancePay-Certificate-SN": key,
    "BinancePay-Signature": signature,
  };

  console.log("[binance-pay] →", "POST", url, {
    body: redactPayload(body),
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: bodyStr, signal: ctrl.signal });
  } catch (e: any) {
    clearTimeout(timer);
    const aborted = e?.name === "AbortError";
    console.error("[binance-pay] fetch failed", { url, aborted, message: String(e?.message ?? e) });
    throw new Error(aborted ? "Binance Pay timeout" : `Binance Pay network error: ${String(e?.message ?? e)}`);
  }
  clearTimeout(timer);
  const raw = await res.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { /* non-JSON */ }
  console.log("[binance-pay] ←", res.status, url, raw.slice(0, 1500));
  return { status: res.status, raw, json };
}

function redactPayload(p: Record<string, unknown>) {
  const copy = { ...p };
  if (copy.buyer && typeof copy.buyer === "object") {
    const b = { ...(copy.buyer as Record<string, unknown>) } as any;
    if (b.buyerEmail) b.buyerEmail = String(b.buyerEmail).replace(/(.{2}).+(@.+)/, "$1***$2");
    copy.buyer = b;
  }
  return copy;
}

export type CreateBinancePayOrderInput = {
  orderRef: string;      // merchantTradeNo (unique per order)
  amount: number;        // in `currency` units, USDT-equivalent
  currency: string;      // "USDT" (default), or a supported crypto ticker
  buyerEmail?: string;
  goodsName: string;     // human-readable product name
  webhookUrl: string;
  returnUrl: string;
  cancelUrl: string;
};

export type CreateBinancePayOrderResult = {
  prepayId: string;
  checkoutUrl: string;
  qrcodeLink: string | null;
  deeplink: string | null;
  expireTime: number | null;
};

export async function createBinancePayOrder(
  input: CreateBinancePayOrderInput,
): Promise<CreateBinancePayOrderResult> {
  const body = {
    env: { terminalType: "WEB" },
    merchantTradeNo: input.orderRef,
    orderAmount: Number(input.amount.toFixed(2)),
    currency: input.currency,
    goods: {
      goodsType: "02", // 01 = tangible, 02 = virtual goods
      goodsCategory: "Z000", // Others
      referenceGoodsId: input.orderRef,
      goodsName: input.goodsName.slice(0, 256),
    },
    buyer: input.buyerEmail
      ? { buyerEmail: input.buyerEmail }
      : undefined,
    webhookUrl: input.webhookUrl,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
  };

  const { status, raw, json } = await binancePayFetch(BINANCE_PAY_CREATE_PATH, body);
  if (status < 200 || status >= 300 || !json) {
    throw new Error(`Binance Pay create order failed (${status}): ${raw.slice(0, 400)}`);
  }
  if (json.status !== "SUCCESS" || !json.data) {
    const msg = json.errorMessage || json.code || "unknown error";
    throw new Error(`Binance Pay refused the order: ${msg}`);
  }
  const d = json.data;
  return {
    prepayId: d.prepayId,
    checkoutUrl: d.universalUrl || d.checkoutUrl,
    qrcodeLink: d.qrcodeLink ?? null,
    deeplink: d.deeplink ?? null,
    expireTime: d.expireTime ?? null,
  };
}

export type BinancePayQueryResult = {
  status: "paid" | "pending" | "failed" | "cancelled" | "expired";
  rawStatus: string;
  transactionId: string | null;
  raw: any;
};

export async function queryBinancePayOrder(orderRef: string): Promise<BinancePayQueryResult> {
  const { status, raw, json } = await binancePayFetch(BINANCE_PAY_QUERY_PATH, {
    merchantTradeNo: orderRef,
  });
  if (status < 200 || status >= 300 || !json) {
    return { status: "pending", rawStatus: `http_${status}`, transactionId: null, raw };
  }
  if (json.status !== "SUCCESS" || !json.data) {
    return { status: "pending", rawStatus: json.code ?? "no_data", transactionId: null, raw: json };
  }
  const d = json.data;
  return {
    status: mapBinancePayStatus(d.status),
    rawStatus: String(d.status ?? ""),
    transactionId: d.transactionId ?? null,
    raw: d,
  };
}

export function mapBinancePayStatus(s: unknown): BinancePayQueryResult["status"] {
  const v = String(s ?? "").toUpperCase();
  if (v === "PAID") return "paid";
  if (v === "CANCELED" || v === "CANCELLED") return "cancelled";
  if (v === "EXPIRED") return "expired";
  if (v === "ERROR" || v === "REFUNDED") return "failed";
  return "pending"; // INITIAL, PENDING
}

/**
 * Verify the RSA-SHA256 signature Binance Pay sends on webhook callbacks.
 * The signature is over the raw request body, base64-encoded, and shipped
 * in the `BinancePay-Signature` header. The public key is provided by
 * Binance via /binancepay/openapi/certificates — we cache the PEM in a
 * project secret so the Worker doesn't need outbound calls to verify.
 */
export function verifyBinancePayWebhook(rawBody: string, headers: Headers): boolean {
  const signature =
    headers.get("binancepay-signature") ??
    headers.get("BinancePay-Signature") ??
    "";
  const timestamp =
    headers.get("binancepay-timestamp") ??
    headers.get("BinancePay-Timestamp") ??
    "";
  const nonce =
    headers.get("binancepay-nonce") ??
    headers.get("BinancePay-Nonce") ??
    "";
  if (!signature || !timestamp || !nonce) return false;

  const pubKey = readEnv(WEBHOOK_PUB_KEY_NAME);
  if (!pubKey) {
    console.error("[binance-pay] missing webhook public key");
    return false;
  }
  // Binance Pay signs `${timestamp}\n${nonce}\n${body}\n` with RSA-SHA256.
  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;
  try {
    const pem = pubKey.includes("BEGIN PUBLIC KEY")
      ? pubKey.replace(/\\n/g, "\n")
      : `-----BEGIN PUBLIC KEY-----\n${pubKey}\n-----END PUBLIC KEY-----`;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(payload);
    verifier.end();
    return verifier.verify(pem, signature, "base64");
  } catch (e) {
    console.error("[binance-pay] webhook signature verification error", e);
    return false;
  }
}