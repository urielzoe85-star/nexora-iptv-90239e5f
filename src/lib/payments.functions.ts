import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Initiate a SebPay checkout session server-side.
 *
 * SECURITY: The client never charges. It calls this server fn, we hit SebPay
 * with the secret key, and return the hosted-checkout URL. The browser is then
 * redirected to SebPay. The order's status stays "processing" until the webhook
 * (and/or verifyPayment below) confirms with SebPay that the transaction
 * succeeded.
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
    const secret = process.env.SEBPAY_SECRET_KEY;
    if (!secret) {
      throw new Error(
        "Payment gateway is not configured. SEBPAY_SECRET_KEY is missing on the server.",
      );
    }

    // Load the pending order. Refuse to start checkout for already-finalized orders.
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error(`Order is already ${order.status}; cannot start a new checkout.`);
    }

    console.log("[sebpay] init checkout", {
      ref: order.order_ref,
      amount: order.amount,
      currency: order.currency,
      method: order.method,
    });

    // Call SebPay's hosted-checkout API. The exact field names follow SebPay's
    // public documentation; adjust if your account uses a different schema.
    const resp = await fetch("https://api.sebpay.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        reference: order.order_ref,
        amount: Number(order.amount),
        currency: order.currency,
        payment_method: order.method,
        customer: { email: order.email, name: order.full_name },
        description: `Nexora IPTV — ${order.plan_name}`,
        success_url: data.successUrl,
        cancel_url: data.failureUrl,
        webhook_url:
          (process.env.PUBLIC_APP_URL ?? "") + "/api/public/sebpay/webhook",
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("[sebpay] init failed", resp.status, text);
      await supabaseAdmin
        .from("orders")
        .update({ status: "failed", metadata: { init_error: text.slice(0, 1000) } })
        .eq("order_ref", order.order_ref)
        .eq("status", "pending");
      throw new Error(`SebPay rejected the request (${resp.status}).`);
    }

    let body: any;
    try { body = JSON.parse(text); } catch { body = {}; }
    const checkoutUrl: string | undefined =
      body.checkout_url ?? body.url ?? body.hosted_url ?? body.redirect_url;
    const sessionId: string | undefined = body.id ?? body.session_id;
    if (!checkoutUrl) {
      console.error("[sebpay] no checkout url in response", body);
      throw new Error("SebPay did not return a checkout URL.");
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        sebpay_reference: sessionId ?? null,
        metadata: { sebpay_session: body },
      })
      .eq("order_ref", order.order_ref);

    console.log("[sebpay] checkout session created", { ref: order.order_ref, sessionId });
    return { checkoutUrl };
  });

/**
 * Verify a payment with SebPay's API. Used by the success page as a second
 * source of truth in addition to the webhook. Returns the current persisted
 * order status (never "paid" unless SebPay confirms).
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ref: z.string().min(4).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, status, sebpay_reference")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return { status: "not_found" as const };

    // Already final: nothing to do.
    if (order.status === "paid" || order.status === "failed" || order.status === "cancelled") {
      return { status: order.status };
    }

    const secret = process.env.SEBPAY_SECRET_KEY;
    if (!secret || !order.sebpay_reference) return { status: order.status };

    try {
      const resp = await fetch(
        `https://api.sebpay.com/v1/checkout/sessions/${encodeURIComponent(order.sebpay_reference)}`,
        { headers: { authorization: `Bearer ${secret}` } },
      );
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error("[sebpay] verify failed", resp.status, body);
        return { status: order.status };
      }
      const raw = (body.status ?? body.payment_status ?? "").toString().toLowerCase();
      const next =
        ["paid", "succeeded", "success", "completed"].includes(raw) ? "paid"
        : ["failed", "declined", "error"].includes(raw) ? "failed"
        : ["cancelled", "canceled"].includes(raw) ? "cancelled"
        : null;

      if (next && next !== order.status) {
        await supabaseAdmin
          .from("orders")
          .update({ status: next, metadata: { verify_response: body } })
          .eq("order_ref", order.order_ref)
          .in("status", ["pending", "processing"]);
        console.log("[sebpay] verify updated status", { ref: order.order_ref, next });
        return { status: next };
      }
      return { status: order.status };
    } catch (err: any) {
      console.error("[sebpay] verify error", err?.message);
      return { status: order.status };
    }
  });