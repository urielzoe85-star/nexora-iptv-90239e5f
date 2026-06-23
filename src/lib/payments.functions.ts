import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =============================================================================
// SebPay LIVE integration (official endpoints — https://sebpay.bj/our-api)
// -----------------------------------------------------------------------------
//   POST  {BASE}/api/v1/collections                 — create a Mobile Money collection
//   GET   {BASE}/api/v1/collections/{id_or_ref}     — verify a collection's status
//
// Auth: two custom headers (X-Public-Key + X-Secret-Key). Both keys are
// server-only secrets and are never exposed to the browser. We log the URL,
// payload, HTTP status and raw body for every call so issues can be diagnosed
// end-to-end.
// =============================================================================
const SEBPAY_BASE_URL = "https://newapi.sebpay.bj";
export const SEBPAY_COLLECTIONS_PATH = "/api/v1/collections";

function sebpayHeaders(): Record<string, string> {
  const pub = process.env.SEBPAY_PUBLIC_KEY;
  const sec = process.env.SEBPAY_SECRET_KEY;
  if (!pub) throw new Error("SEBPAY_PUBLIC_KEY is not configured");
  if (!sec) throw new Error("SEBPAY_SECRET_KEY is not configured");
  return {
    "X-Public-Key": pub,
    "X-Secret-Key": sec,
    Accept: "application/json",
  };
}

async function sebpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ status: number; raw: string; json: any }> {
  const url = `${SEBPAY_BASE_URL}${path}`;
  const headers: Record<string, string> = sebpayHeaders();
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  console.log("[sebpay] →", init.method, url, init.body ? { payload: init.body } : "");
  const res = await fetch(url, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const raw = await res.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { /* non-JSON */ }
  console.log("[sebpay] ←", res.status, url, raw.slice(0, 2000));
  return { status: res.status, raw, json };
}

// Map SebPay's documented statuses (approved | rejected | pending) to one of
// our 4 internal states. Anything unknown is treated as "pending".
function mapSebpayStatus(s: unknown): "paid" | "failed" | "cancelled" | "pending" {
  const v = String(s ?? "").toLowerCase();
  if (["approved", "success", "successful", "succeeded", "paid", "completed"].includes(v)) return "paid";
  if (["rejected", "failed", "failure", "error", "declined"].includes(v)) return "failed";
  if (["cancelled", "canceled"].includes(v)) return "cancelled";
  return "pending";
}

/**
 * Create a payment with SebPay (POST /v1/payments) and return the URL the
 * customer must be redirected to. The order is moved to "processing"; it will
 * only flip to "paid" after verifyPayment / the webhook confirms with SebPay.
 */
export const initSebPayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ref: z.string().min(4).max(40),
        successUrl: z.string().url(),
        failureUrl: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error(`Order is already ${order.status}; cannot start a new checkout.`);
    }

    if (order.method !== "momo") {
      throw new Error("Only Mobile Money (MTN / Orange) is currently supported.");
    }
    const momo = (order.metadata as any)?.momo as
      | { phone?: string; operator?: string; country?: string }
      | undefined;
    if (!momo?.phone || !momo?.operator || !momo?.country) {
      throw new Error(
        "Mobile Money order is missing phone / operator / country — please re-enter your payment details.",
      );
    }

    // Documented webhook receiver — always the /api/public/* TSS route so
    // SebPay's POST is not blocked by Lovable's published-site auth.
    const callbackUrl = `${new URL(data.successUrl).origin}/api/public/sebpay/webhook`;

    // Documented payload for POST /api/v1/collections.
    const payload: Record<string, any> = {
      amount: Number(order.amount),
      currency: order.currency, // "XOF"
      phone: momo.phone,
      operator: momo.operator,
      country: momo.country,
      external_reference: order.order_ref,
      callback_url: callbackUrl,
    };

    const endpoint = `${SEBPAY_BASE_URL}${SEBPAY_COLLECTIONS_PATH}`;
    const { status, raw, json } = await sebpayFetch(SEBPAY_COLLECTIONS_PATH, {
      method: "POST",
      body: payload,
    });
    if (status < 200 || status >= 300 || !json) {
      // Surface the verbatim SebPay error (message + any field-level details)
      // so the user sees exactly why their payment was rejected.
      const detail =
        (json && (json.message || json.error || json.detail)) ||
        raw.slice(0, 500) ||
        "(empty response body)";
      const fieldErrors =
        json && json.errors
          ? ` — fields: ${JSON.stringify(json.errors).slice(0, 400)}`
          : "";
      throw new Error(
        `SebPay refused the payment (HTTP ${status} on POST ${endpoint}): ${detail}${fieldErrors}`,
      );
    }

    // Documented response fields: transaction_id, status, external_reference,
    // provider_link, message. provider_link is the operator's payment page
    // (when SebPay can't push USSD directly) and must be opened in a new tab.
    const d = json.data ?? json;
    const sebpayId: string | undefined =
      d.transaction_id ?? d.id ?? d.reference;
    const providerLink: string | undefined =
      d.provider_link ?? d.payment_url ?? d.checkout_url ?? d.url ?? undefined;
    const sebMessage: string | undefined = d.message ?? json.message;
    const sebStatus: string | undefined = d.status ?? json.status;
    if (!sebpayId) {
      throw new Error(
        `SebPay did not return a transaction_id. Raw response: ${raw.slice(0, 500)}`,
      );
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        sebpay_reference: sebpayId,
        metadata: {
          ...((order.metadata as any) ?? {}),
          sebpay_endpoint: endpoint,
          sebpay_request: payload,
          sebpay_response: json,
          sebpay_provider_link: providerLink ?? null,
          sebpay_initial_status: sebStatus ?? null,
        },
      })
      .eq("order_ref", order.order_ref);

    return {
      transactionId: sebpayId,
      providerLink: providerLink ?? null,
      status: sebStatus ?? "pending",
      message: sebMessage ?? null,
      endpoint,
      payload,
      response: json,
    };
  });

/**
 * Verify a payment with SebPay (GET /v1/payments/{id}). The order status is
 * only updated when SebPay returns a terminal state.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ref: z.string().min(4).max(40) }).parse(data),
  )
  .handler(async ({ data }) => verifyPaymentInternal(data.ref));

export async function verifyPaymentInternal(ref: string): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("order_ref, status, sebpay_reference")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };

  // Already finalized → don't re-query SebPay.
  if (["paid", "failed", "cancelled"].includes(order.status)) {
    return { status: order.status };
  }
  if (!order.sebpay_reference) {
    return { status: order.status };
  }

  const { status: httpStatus, raw, json } = await sebpayFetch(
    `${SEBPAY_COLLECTIONS_PATH}/${encodeURIComponent(order.sebpay_reference)}`,
    { method: "GET" },
  );
  if (httpStatus < 200 || httpStatus >= 300 || !json) {
    console.error("[sebpay] verify failed", { ref, httpStatus, raw: raw.slice(0, 300) });
    return { status: order.status }; // unchanged
  }

  const d = json.data ?? json;
  const sebStatus = d.status ?? json.status ?? json.payment_status;
  const mapped = mapSebpayStatus(sebStatus);
  if (mapped === "pending") return { status: "processing" };

  await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      metadata: {
        sebpay_verify_response: json,
        sebpay_verified_status: sebStatus,
        verified_at: new Date().toISOString(),
      },
    })
    .eq("order_ref", ref)
    .in("status", ["pending", "processing"]);

  return { status: mapped };
}