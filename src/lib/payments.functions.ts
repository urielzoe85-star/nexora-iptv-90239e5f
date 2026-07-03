import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Sprint 3 · GA-BLOCK-01 — All top-level SebPay helpers have been moved to
// `src/lib/payments-sebpay.server.ts` so no SebPay secret NAME literal
// (SEBPAY_PUBLIC_KEY / SEBPAY_SECRET_KEY) survives in the client bundle.
// Handlers below dynamic-import those helpers; the server-fn Vite plugin
// strips handler bodies from client chunks.
//
// SebPay LIVE integration — https://sebpay.bj/our-api
//   POST  {BASE}/api/v1/collections                 — create a Mobile Money collection
//   GET   {BASE}/api/v1/collections/{id_or_ref}     — verify a collection's status
export const SEBPAY_COLLECTIONS_PATH = "/api/v1/collections";

/**
 * Create a payment with SebPay (POST /api/v1/collections) and return the URL the
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
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const {
      SEBPAY_BASE_URL,
      SEBPAY_COLLECTIONS_PATH: PATH,
      normalizePhone,
      operatorSlug,
      sebpayFetch,
    } = await import("@/lib/payments-sebpay.server");
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

    const callbackUrl = `${new URL(data.successUrl).origin}/api/public/sebpay/webhook`;

    const payload: Record<string, any> = {
      amount: Number(order.amount),
      currency: order.currency,
      phone: normalizePhone(momo.phone),
      operator: operatorSlug(momo.operator),
      country: momo.country,
      external_reference: order.order_ref,
      callback_url: callbackUrl,
    };

    const endpoint = `${SEBPAY_BASE_URL}${PATH}`;
    const { status, raw, json } = await sebpayFetch(PATH, { method: "POST", body: payload });
    if (status < 200 || status >= 300 || !json) {
      const detail =
        (json && (json.message || json.error || json.detail)) ||
        raw.slice(0, 500) ||
        "(empty response body)";
      const fieldErrors =
        json && json.errors ? ` — fields: ${JSON.stringify(json.errors).slice(0, 400)}` : "";
      console.error("[sebpay] create collection failed", { status, endpoint, detail, fieldErrors });
      throw new Error("Le paiement n'a pas pu être initialisé. Veuillez réessayer ou contacter le support.");
    }

    const d = json.data ?? json;
    const sebpayId: string | undefined = d.transaction_id ?? d.id ?? d.reference;
    const providerLink: string | undefined =
      d.provider_link ?? d.payment_url ?? d.checkout_url ?? d.url ?? undefined;
    const sebMessage: string | undefined = d.message ?? json.message;
    const sebStatus: string | undefined = d.status ?? json.status;
    if (!sebpayId) {
      throw new Error(`SebPay did not return a transaction_id. Raw response: ${raw.slice(0, 500)}`);
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
    };
  });

/**
 * Verify a payment with SebPay (GET /api/v1/collections/{id}).
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => verifyPaymentInternal(data.ref));

export async function verifyPaymentInternal(ref: string): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const {
    SEBPAY_COLLECTIONS_PATH: PATH,
    sebpayFetch,
    mapSebpayStatus,
  } = await import("@/lib/payments-sebpay.server");
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("order_ref, status, sebpay_reference, metadata")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };

  if (["paid", "failed", "cancelled"].includes(order.status)) {
    return { status: order.status };
  }
  if (!order.sebpay_reference) {
    return { status: order.status };
  }

  const { status: httpStatus, raw, json } = await sebpayFetch(
    `${PATH}/${encodeURIComponent(order.sebpay_reference)}`,
    { method: "GET" },
  );
  if (httpStatus < 200 || httpStatus >= 300 || !json) {
    console.error("[sebpay] verify failed", { ref, httpStatus, raw: raw.slice(0, 300) });
    return { status: order.status };
  }

  const d = json.data ?? json;
  const sebStatus = d.status ?? json.status ?? json.payment_status;
  const mapped = mapSebpayStatus(sebStatus);
  if (mapped === "pending") return { status: "processing" };

  const { data: updatedRows } = await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      metadata: {
        ...((order.metadata as any) ?? {}),
        sebpay_verify_response: json,
        sebpay_verified_status: sebStatus,
        verified_at: new Date().toISOString(),
      },
    })
    .eq("order_ref", ref)
    .in("status", ["pending", "processing"])
    .select("order_ref, email, plan_name, amount, currency");

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0;
  if (transitioned) {
    const row = updatedRows[0]!;
    if (mapped === "paid") {
      try {
        const { reactivateAccountsForOrder } = await import("@/lib/billing.server");
        const { data: internal } = await supabaseAdmin
          .from("orders").select("id").eq("order_ref", ref).maybeSingle();
        if (internal?.id) {
          await reactivateAccountsForOrder(internal.id, { source: "payment.verify" });
        }
      } catch (e) {
        console.error("[billing] reactivation on payment failed", e);
      }
    }
    await emitBusinessEvent(
      mapped === "paid" ? "payment.confirmed" : mapped === "failed" ? "payment.failed" : null,
      {
        orderId: row.order_ref,
        orderRef: row.order_ref,
        email: row.email,
        planName: row.plan_name,
        amount: row.amount,
        currency: row.currency,
        sebpayStatus: sebStatus,
      },
    );
  }

  return { status: mapped };
}

/**
 * Emit a business event into the automation queue. Failures are logged and
 * swallowed — payment processing must never fail because the automation
 * queue is temporarily unavailable.
 */
export async function emitBusinessEvent(
  event: "payment.confirmed" | "payment.failed" | "order.created" | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!event) return;
  try {
    await import("@/automation");
    const { automationApi } = await import("@/automation");
    const ref = String((payload as any).orderRef ?? (payload as any).orderId ?? "");
    const idempotencyKey = ref ? `${event}:${ref}` : null;
    await automationApi.emit(event, payload, { sync: false, idempotencyKey });
  } catch (e: any) {
    console.error("[automation] emit failed", { event, message: String(e?.message ?? e) });
  }
}
