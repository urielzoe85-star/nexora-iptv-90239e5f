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
    // We wrap the fetch so TLS / DNS / network failures (e.g. Cloudflare 525
    // "SSL handshake failed" returned by an upstream gateway) become a clean,
    // user-friendly error rather than a raw stack trace.
    let resp: Response;
    try {
      resp = await fetch("https://api.sebpay.com/v1/checkout/sessions", {
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
    } catch (err: any) {
      const reason = err?.message ?? String(err);
      console.error("[sebpay] network/TLS error reaching gateway", reason);
      await supabaseAdmin
        .from("orders")
        .update({
          status: "failed",
          metadata: {
            init_error: `network_error: ${reason}`.slice(0, 1000),
            failure_reason:
              "La passerelle de paiement est injoignable (handshake SSL/TLS échoué). Réessayez dans quelques minutes.",
          },
        })
        .eq("order_ref", order.order_ref)
        .eq("status", "pending");
      throw new Error(
        "La passerelle de paiement est temporairement injoignable. Veuillez réessayer dans quelques instants.",
      );
    }

    const text = await resp.text();
    if (!resp.ok) {
      console.error("[sebpay] init failed", resp.status, text);
      const friendly =
        resp.status === 525 || resp.status === 526
          ? "La passerelle de paiement a refusé la connexion sécurisée (SSL handshake failed). Réessayez dans quelques minutes."
          : resp.status >= 500
            ? "La passerelle de paiement rencontre une erreur temporaire. Réessayez bientôt."
            : "La passerelle de paiement a rejeté la demande. Vérifiez vos informations et réessayez.";
      await supabaseAdmin
        .from("orders")
        .update({
          status: "failed",
          metadata: {
            init_error: text.slice(0, 1000),
            init_status: resp.status,
            failure_reason: friendly,
          },
        })
        .eq("order_ref", order.order_ref)
        .eq("status", "pending");
      throw new Error(friendly);
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
  .handler(async ({ data }) => verifyPaymentInternal(data.ref));

/**
 * Internal verification helper — usable from both `verifyPayment` (a server
 * function called by the success page) and the webhook handler. Always queries
 * SebPay's API with the server-side secret key; never trusts client/webhook
 * input. Only mutates an order's status from pending/processing to a final
 * state (paid / failed / cancelled) when SebPay confirms it.
 */
export async function verifyPaymentInternal(ref: string): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("order_ref, status, sebpay_reference")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };

  // Already final: nothing to do.
  if (order.status === "paid" || order.status === "failed" || order.status === "cancelled") {
    return { status: order.status };
  }

  const secret = process.env.SEBPAY_SECRET_KEY;
  if (!secret) {
    console.error("[sebpay] verify skipped: SEBPAY_SECRET_KEY missing");
    return { status: order.status };
  }
  if (!order.sebpay_reference) return { status: order.status };

  try {
    const resp = await fetch(
      `https://api.sebpay.com/v1/transactions/${encodeURIComponent(order.sebpay_reference)}`,
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
}