// CamerPay adapter — server-only helpers.
//
// Loaded exclusively via `await import("@/lib/payments-camerpay.server")`
// from inside `createServerFn` handler bodies, so the TanStack Vite plugin
// keeps the CAMERPAY_* env names out of client bundles.
//
// Docs:
//   POST {BASE}/api/payment/initiate     — create a transaction (JSON)
//   GET  {BASE}/api/payment/{uuid}/status — read a transaction's status
//   Webhooks: form-urlencoded, HMAC-SHA256 over "uuid|invoice_id|status|amount"

const DEFAULT_BASE_URL = "https://camerpay.biz";

export function camerpayBaseUrl(): string {
  const raw = (process.env.CAMERPAY_BASE_URL ?? "").trim().replace(/\/+$/, "");
  return raw || DEFAULT_BASE_URL;
}

function cleanSecretValue(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function camerpayApiKey(): string {
  const key = cleanSecretValue(process.env.CAMERPAY_API_KEY ?? "");
  if (!key) {
    throw new Error(
      "Configuration de paiement indisponible: CAMERPAY_API_KEY manquante côté serveur.",
    );
  }
  return key;
}

export function camerpayWebhookSecret(): string {
  const s = cleanSecretValue(process.env.CAMERPAY_WEBHOOK_SECRET ?? "");
  if (!s) throw new Error("CAMERPAY_WEBHOOK_SECRET manquante côté serveur.");
  return s;
}

/**
 * Webhook secret partagé avec le dashboard CamerPay pour le canal Stripe.
 * CamerPay agrège Stripe côté passerelle puis relaie vers Nexora avec la même
 * convention de signature (HMAC-SHA256 sur `uuid|invoice_id|status|amount`),
 * mais nous isolons le secret pour pouvoir le rotationner indépendamment.
 */
export function camerpayStripeWebhookSecret(): string {
  const s = cleanSecretValue(process.env.CAMERPAY_STRIPE_WEBHOOK_SECRET ?? "");
  if (!s) throw new Error("CAMERPAY_STRIPE_WEBHOOK_SECRET manquante côté serveur.");
  return s;
}

/** Webhook secret partagé pour le canal PayPal (via CamerPay). */
export function camerpayPaypalWebhookSecret(): string {
  const s = cleanSecretValue(process.env.CAMERPAY_PAYPAL_WEBHOOK_SECRET ?? "");
  if (!s) throw new Error("CAMERPAY_PAYPAL_WEBHOOK_SECRET manquante côté serveur.");
  return s;
}

export type CamerPayStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";

export function mapCamerpayStatus(s: unknown): "paid" | "failed" | "cancelled" | "pending" {
  const v = String(s ?? "").toLowerCase();
  if (v === "completed" || v === "refunded") return "paid";
  if (v === "failed") return "failed";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  return "pending";
}

async function camerpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ status: number; raw: string; json: any }> {
  const url = `${camerpayBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${camerpayApiKey()}`,
    Accept: "application/json",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.method === "GET" ? 8_000 : 20_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    const aborted = e?.name === "AbortError";
    console.error("[camerpay] fetch failed", { url, method: init.method, aborted, message: String(e?.message ?? e) });
    throw new Error(aborted ? "CamerPay timeout" : `CamerPay network error: ${String(e?.message ?? e)}`);
  }
  clearTimeout(timer);
  const raw = await res.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { /* non-JSON */ }
  console.log("[camerpay] ←", res.status, url, raw.slice(0, 1000));
  return { status: res.status, raw, json };
}

export type CamerpayInitiateInput = {
  amount: number;
  invoiceId: string;
  callbackUrl: string;
  returnUrl: string;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod?: "orange_money" | "mtn_momo" | "stripe" | "paypal";
  source?: string;
};

export type CamerpayInitiateResult = {
  transactionUuid: string;
  payUrl: string;
  status: string;
  message: string | null;
  raw: any;
};

export async function camerpayInitiate(input: CamerpayInitiateInput): Promise<CamerpayInitiateResult> {
  const payload: Record<string, unknown> = {
    amount: input.amount,
    currency: "XAF",
    merchant_invoice_id: input.invoiceId,
    merchant_callback_url: input.callbackUrl,
    merchant_return_url: input.returnUrl,
    idempotency_key: input.invoiceId,
    source: input.source ?? "nexora-ncc",
  };
  if (input.customerEmail) payload.customer_email = input.customerEmail;
  if (input.customerName) payload.customer_name = input.customerName;
  if (input.customerPhone) payload.customer_phone = input.customerPhone.replace(/\D/g, "");
  if (input.paymentMethod) payload.payment_method = input.paymentMethod;

  const { status, raw, json } = await camerpayFetch("/api/payment/initiate", { method: "POST", body: payload });
  if (status < 200 || status >= 300 || !json?.transaction_uuid) {
    const detail = (json && (json.message || json.error)) || raw.slice(0, 400) || "(empty)";
    console.error("[camerpay] initiate failed", { status, detail });
    throw new Error("Le paiement CamerPay n'a pas pu être initialisé. Veuillez réessayer.");
  }
  return {
    transactionUuid: String(json.transaction_uuid),
    payUrl: String(json.pay_url ?? json.redirect_url ?? ""),
    status: String(json.status ?? "pending"),
    message: json.message ? String(json.message) : null,
    raw: json,
  };
}

export async function camerpayStatus(uuid: string): Promise<{ status: string; raw: any } | null> {
  const { status, raw, json } = await camerpayFetch(
    `/api/payment/${encodeURIComponent(uuid)}/status`,
    { method: "GET" },
  );
  if (status < 200 || status >= 300 || !json) {
    console.error("[camerpay] status failed", { uuid, status, raw: raw.slice(0, 300) });
    return null;
  }
  return { status: String(json.status ?? "pending"), raw: json };
}

/**
 * HMAC-SHA256 verification for CamerPay webhooks.
 * Signed data: "uuid|invoice_id|status|amount".
 * Returns true when both signatures are the same length and match in constant time.
 */
export async function verifyCamerpaySignature(params: {
  uuid: string;
  invoiceId: string;
  status: string;
  amount: string;
  signature: string;
  secret: string;
}): Promise<boolean> {
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const data = `${params.uuid}|${params.invoiceId}|${params.status}|${params.amount}`;
  const expected = createHmac("sha256", params.secret).update(data).digest("hex");
  const provided = params.signature.trim().toLowerCase();
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Pick a payment provider based on the customer's country code (ISO alpha-2).
 * - CM (Cameroun) → CamerPay
 * - Countries with a non-XAF MoMo currency in Nexora's SebPay coverage → SebPay
 * - Anything else (international card / PayPal) → CamerPay
 *
 * `override` (from admin re-tries or explicit UI choice) always wins.
 */
export function pickPaymentProvider(
  country: string | null | undefined,
  override?: "sebpay" | "camerpay" | null,
): "sebpay" | "camerpay" {
  if (override === "sebpay" || override === "camerpay") return override;
  const c = String(country ?? "").toUpperCase();
  if (c === "CM") return "camerpay";
  const SEBPAY_COUNTRIES = new Set(["BJ", "SN", "CI", "TG", "BF", "ML", "NE", "GN"]);
  if (SEBPAY_COUNTRIES.has(c)) return "sebpay";
  return "camerpay";
}