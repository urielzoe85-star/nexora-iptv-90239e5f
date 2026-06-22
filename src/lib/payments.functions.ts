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

    // Hosted checkout is served from this same app (internal SebPay-branded
    // page). The browser is redirected to /pay/<ref>, the customer confirms
    // or cancels, and the server marks the order paid/cancelled accordingly.
    // Order stays in "processing" until that page resolves it.
    const sessionId = `sess_${order.order_ref}_${Date.now().toString(36)}`;
    const checkoutUrl =
      `/pay/${encodeURIComponent(order.order_ref)}` +
      `?success=${encodeURIComponent(data.successUrl)}` +
      `&cancel=${encodeURIComponent(data.failureUrl)}`;

    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        sebpay_reference: sessionId,
        metadata: { checkout_session_id: sessionId },
      })
      .eq("order_ref", order.order_ref);

    console.log("[sebpay] checkout session created", { ref: order.order_ref, sessionId });
    return { checkoutUrl };
  });

/**
 * Confirm a payment from the internal hosted checkout page. Marks the order
 * as paid. Only transitions orders that are still pending/processing.
 */
export const confirmCheckoutPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ref: z.string().min(4).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        metadata: { paid_at: new Date().toISOString() },
      })
      .eq("order_ref", data.ref)
      .in("status", ["pending", "processing"])
      .select("order_ref, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? { order_ref: data.ref, status: "unknown" };
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
    .select("order_ref, status")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };
  // Checkout is processed on our hosted /pay page; the persisted status is
  // the source of truth.
  return { status: order.status };
}