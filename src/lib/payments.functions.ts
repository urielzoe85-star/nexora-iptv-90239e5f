import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =============================================================================
// SebPay LIVE integration
// -----------------------------------------------------------------------------
// Documented base URL + endpoints (https://sebpay.bj/our-api):
//   POST  {BASE}/v1/payments        — create a payment
//   GET   {BASE}/v1/payments/{id}   — verify payment status
//   POST  {BASE}/v1/payouts         — payouts (unused here)
//   GET   {BASE}/v1/balance         — balance     (unused here)
//
// Auth: Bearer token = SEBPAY_SECRET_KEY (server-side secret, never exposed).
// We log the exact URL, request payload, HTTP status and raw response body
// for every call so issues can be diagnosed end-to-end.
// =============================================================================
const SEBPAY_BASE_URL = "https://newapi.sebpay.bj";
export const SEBPAY_PAYMENTS_PATH = "/v1/payments";

function sebpaySecret(): string {
  const k = process.env.SEBPAY_SECRET_KEY;
  if (!k) throw new Error("SEBPAY_SECRET_KEY is not configured");
  return k;
}

async function sebpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ status: number; raw: string; json: any }> {
  const url = `${SEBPAY_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${sebpaySecret()}`,
    Accept: "application/json",
  };
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

// Map any status string SebPay returns to one of our 4 internal states.
function mapSebpayStatus(s: unknown): "paid" | "failed" | "cancelled" | "pending" {
  const v = String(s ?? "").toLowerCase();
  if (["success", "successful", "succeeded", "paid", "completed", "approved"].includes(v)) return "paid";
  if (["failed", "failure", "error", "declined"].includes(v)) return "failed";
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

    const webhookUrl = `${new URL(data.successUrl).origin}/api/public/sebpay/webhook`;
    const momo = (order.metadata as any)?.momo as
      | { phone?: string; operator?: string; country?: string }
      | undefined;

    // Build the exact payload SebPay documents at https://sebpay.bj/our-api
    // for POST /v1/payments. Mobile Money requires amount/currency/operator/
    // phone/country. We always attach a reference + callback/webhook URLs so
    // we can re-verify the payment server-side.
    const payload: Record<string, any> = {
      amount: Number(order.amount),
      currency: order.currency,
      reference: order.order_ref,
      description: `Nexora IPTV — ${order.plan_name}`,
      customer: { email: order.email, name: order.full_name },
      success_url: data.successUrl,
      cancel_url: data.failureUrl,
      callback_url: data.successUrl,
      webhook_url: webhookUrl,
      metadata: { order_ref: order.order_ref },
    };
    if (order.method === "momo") {
      if (!momo?.phone || !momo?.operator || !momo?.country) {
        throw new Error(
          "Mobile Money order is missing phone/operator/country — please re-enter your payment details.",
        );
      }
      payload.operator = momo.operator;
      payload.phone = momo.phone;
      payload.country = momo.country;
    } else {
      payload.method = order.method;
    }

    const endpoint = `${SEBPAY_BASE_URL}${SEBPAY_PAYMENTS_PATH}`;
    const { status, raw, json } = await sebpayFetch(SEBPAY_PAYMENTS_PATH, {
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

    // SebPay may name the redirect field a few different ways depending on
    // the product. For Mobile Money there is often no redirect at all — the
    // customer approves on their phone (USSD push), and we poll
    // GET /v1/payments/{id} until SebPay reports a terminal state.
    const checkoutUrl: string | undefined =
      json.checkout_url ?? json.payment_url ?? json.url ?? json.redirect_url ?? json.data?.checkout_url;
    const sebpayId: string | undefined =
      json.id ?? json.transaction_id ?? json.payment_id ?? json.data?.id;
    if (!sebpayId) {
      throw new Error(
        `SebPay did not return a transaction id. Raw response: ${raw.slice(0, 500)}`,
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
        },
      })
      .eq("order_ref", order.order_ref);

    return {
      checkoutUrl: checkoutUrl ?? null,
      sebpayId,
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
    `/v1/payments/${encodeURIComponent(order.sebpay_reference)}`,
    { method: "GET" },
  );
  if (httpStatus < 200 || httpStatus >= 300 || !json) {
    console.error("[sebpay] verify failed", { ref, httpStatus, raw: raw.slice(0, 300) });
    return { status: order.status }; // unchanged
  }

  const sebStatus = json.status ?? json.payment_status ?? json.data?.status;
  const mapped = mapSebpayStatus(sebStatus);
  if (mapped === "pending") return { status: "processing" };

  await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      metadata: { sebpay_verify_response: json, verified_at: new Date().toISOString() },
    })
    .eq("order_ref", ref)
    .in("status", ["pending", "processing"]);

  return { status: mapped };
}