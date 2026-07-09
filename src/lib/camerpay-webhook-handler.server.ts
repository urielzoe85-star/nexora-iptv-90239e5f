// Shared handler for all CamerPay-format signed webhook receivers.
//
// CamerPay routes three payment channels (native Mobile Money, Stripe, PayPal)
// and pushes a webhook to Nexora after each transaction. All three use the
// same wire format:
//   Content-Type: application/x-www-form-urlencoded
//   Body fields: uuid, invoice_id, status, amount, signature
//                (+ failure_reason, failure_code, is_sandbox when relevant)
//   Signature: HMAC-SHA256 of `uuid|invoice_id|status|amount` in hex,
//              sent either in header X-CamerPay-Signature or the `signature`
//              body field.
//
// We expose three distinct HTTPS endpoints so the merchant dashboard can
// declare a separate URL (and rotate a separate secret) per channel, but the
// processing logic is identical — only the shared secret and the
// `payment_provider` tag stored on the order change.

import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

export type CamerpayChannel = "camerpay" | "stripe" | "paypal";

async function logWebhook(row: {
  ok: boolean;
  status: number;
  route: string;
  connectorId: string;
  ref?: string | null;
  eventId?: string | null;
  signatureValid?: boolean;
  rawPreview?: string;
  payloadPreview?: unknown;
  error?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("integration_debug_logs").insert({
      connector_id: row.connectorId,
      operation: "webhook",
      method: "POST",
      url: row.route,
      status: row.status,
      ok: row.ok,
      attempts: 1,
      request_body: row.payloadPreview
        ? { ref: row.ref, event_id: row.eventId, payload: row.payloadPreview }
        : { ref: row.ref ?? null, event_id: row.eventId ?? null, raw: row.rawPreview ?? null },
      response_body: row.signatureValid === undefined
        ? { error: row.error ?? null }
        : { signature_valid: row.signatureValid, error: row.error ?? null },
      error: row.error ?? null,
    });
  } catch (e) {
    console.error("[camerpay-webhook] log persistence failed", e);
  }
}

export interface HandleCamerpayWebhookOptions {
  request: Request;
  /** Env var name of the shared HMAC secret to use. */
  secret: string;
  /** Which payment channel this webhook belongs to (stored on the order). */
  channel: CamerpayChannel;
  /** Route path, used for logs / rate-limit key / security events. */
  route: string;
}

export async function processCamerpayFormattedWebhook(
  opts: HandleCamerpayWebhookOptions,
): Promise<Response> {
  const { request, secret, channel, route } = opts;
  const connectorId = `payment.${channel}`;
  const rlKey = `${channel}-webhook`;

  const rl = allow(clientKey(request, rlKey), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const raw = await request.text();
  const form = new URLSearchParams(raw);
  const uuid = form.get("uuid") ?? "";
  const invoiceId = form.get("invoice_id") ?? "";
  const status = form.get("status") ?? "";
  const amount = form.get("amount") ?? "";
  const bodySignature = form.get("signature") ?? "";
  const failureReason = form.get("failure_reason");
  const failureCode = form.get("failure_code");
  const isSandbox = form.get("is_sandbox") === "true";
  const eventId =
    request.headers.get("x-camerpay-event-id") ??
    request.headers.get("X-CamerPay-Event-Id") ??
    request.headers.get("idempotency-key") ??
    request.headers.get("Idempotency-Key") ??
    null;

  // ---- 1. Verify HMAC-SHA256 signature ------------------------------
  const signatureHeader =
    request.headers.get("x-camerpay-signature") ??
    request.headers.get("X-CamerPay-Signature") ??
    "";
  const signature = (signatureHeader || bodySignature).trim();

  if (!secret) {
    await logWebhook({ ok: false, status: 500, route, connectorId, error: "missing shared secret", rawPreview: raw.slice(0, 200) });
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!signature) {
    await logWebhook({ ok: false, status: 401, route, connectorId, error: "missing signature", rawPreview: raw.slice(0, 200) });
    return new Response("Missing signature", { status: 401 });
  }

  const { verifyCamerpaySignature } = await import("@/lib/payments-camerpay.server");
  const signatureValid = await verifyCamerpaySignature({
    uuid, invoiceId, status, amount, signature, secret,
  });
  if (!signatureValid) {
    console.warn(`[${channel}-webhook] invalid signature`, { uuid, invoiceId, status });
    await logWebhook({
      ok: false, status: 401, route, connectorId,
      signatureValid: false, error: "invalid signature",
      rawPreview: raw.slice(0, 200), ref: invoiceId, eventId,
    });
    try {
      const { recordSecurityEvent, extractRequestMeta } = await import("@/lib/security-events.server");
      const meta = extractRequestMeta(request);
      await recordSecurityEvent({
        event_type: `webhook.${channel}.signature_invalid`,
        severity: "critical",
        route,
        ip: meta.ip,
        user_agent: meta.user_agent,
        request_id: meta.request_id,
        message: `${channel} webhook rejected: HMAC signature mismatch`,
        payload: { invoice_id: invoiceId, provided_length: signature.length },
      });
    } catch { /* best effort */ }
    return new Response("Invalid signature", { status: 401 });
  }

  if (!invoiceId || !uuid || !status) {
    await logWebhook({ ok: false, status: 400, route, connectorId, signatureValid: true, error: "missing required field", payloadPreview: { uuid, invoiceId, status } });
    return new Response("Missing fields", { status: 400 });
  }

  console.log(`[${channel}-webhook] received`, { uuid, invoiceId, status, isSandbox });

  // ---- 2. Load & transition order (idempotent) ----------------------
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, order_ref, status, email, plan_name, amount, currency, metadata")
    .eq("order_ref", invoiceId)
    .maybeSingle();

  if (!order) {
    await logWebhook({ ok: false, status: 200, route, connectorId, signatureValid: true, error: "order not found", ref: invoiceId, eventId, payloadPreview: { uuid, status } });
    return Response.json({ ok: true, ignored: "order not found" });
  }

  const meta = (order.metadata as Record<string, any>) ?? {};
  const eventLogKey = `${channel}_events`;
  const seenEvents: string[] = Array.isArray(meta[eventLogKey]) ? meta[eventLogKey] : [];
  if (eventId && seenEvents.includes(eventId)) {
    await logWebhook({ ok: true, status: 200, route, connectorId, signatureValid: true, ref: invoiceId, eventId, payloadPreview: { status, duplicate: true } });
    return Response.json({ ok: true, duplicate: true });
  }

  const mapped: "paid" | "failed" | "cancelled" | "pending" =
    status === "completed" || status === "refunded" ? "paid"
    : status === "failed" ? "failed"
    : status === "cancelled" || status === "canceled" ? "cancelled"
    : "pending";

  if (["paid", "failed", "cancelled"].includes(order.status)) {
    const nextMeta = {
      ...meta,
      [eventLogKey]: eventId ? [...seenEvents, eventId].slice(-50) : seenEvents,
    };
    await supabaseAdmin.from("orders").update({ metadata: nextMeta }).eq("id", order.id);
    await logWebhook({ ok: true, status: 200, route, connectorId, signatureValid: true, ref: invoiceId, eventId, payloadPreview: { status, alreadyTerminal: order.status } });
    return Response.json({ ok: true, status: order.status });
  }

  if (mapped === "pending") {
    await logWebhook({ ok: true, status: 200, route, connectorId, signatureValid: true, ref: invoiceId, eventId, payloadPreview: { status } });
    return Response.json({ ok: true, status: "pending" });
  }

  const nextMeta = {
    ...meta,
    payment_provider: channel,
    provider_reference: uuid,
    [eventLogKey]: eventId ? [...seenEvents, eventId].slice(-50) : seenEvents,
    [`${channel}_last_webhook`]: {
      uuid, invoice_id: invoiceId, status, amount,
      failure_reason: failureReason ?? null,
      failure_code: failureCode ?? null,
      is_sandbox: isSandbox,
      event_id: eventId,
      received_at: new Date().toISOString(),
    },
    ...(failureReason ? { failure_reason: failureReason } : {}),
    ...(failureCode ? { failure_code: failureCode } : {}),
  };

  const { data: updatedRows, error: upErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      payment_provider: channel,
      provider_reference: uuid,
      metadata: nextMeta,
    })
    .eq("id", order.id)
    .in("status", ["pending", "processing"])
    .select("id, order_ref, email, plan_name, amount, currency");

  if (upErr) {
    console.error(`[${channel}-webhook] update failed`, upErr);
    await logWebhook({ ok: false, status: 200, route, connectorId, signatureValid: true, ref: invoiceId, eventId, error: upErr.message });
    return Response.json({ ok: true, warn: "update-failed" });
  }

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0;
  if (transitioned) {
    const row = updatedRows[0]!;
    if (mapped === "paid") {
      try {
        const { reactivateAccountsForOrder } = await import("@/lib/billing.server");
        await reactivateAccountsForOrder(row.id, { source: `payment.webhook.${channel}` });
      } catch (e) {
        console.error(`[billing] reactivation on ${channel} webhook failed`, e);
      }
    }
    try {
      const { emitBusinessEvent } = await import("@/lib/payments.functions");
      await emitBusinessEvent(
        mapped === "paid" ? "payment.confirmed" : mapped === "failed" ? "payment.failed" : null,
        {
          orderId: row.order_ref,
          orderRef: row.order_ref,
          email: row.email,
          planName: row.plan_name,
          amount: row.amount,
          currency: row.currency,
          provider: channel,
          providerStatus: status,
          failureReason: failureReason ?? null,
          failureCode: failureCode ?? null,
        },
      );
    } catch (e) {
      console.error(`[${channel}-webhook] emit failed`, e);
    }
  }

  await logWebhook({
    ok: true, status: 200, route, connectorId,
    signatureValid: true, ref: invoiceId, eventId,
    payloadPreview: { status, mapped, transitioned },
  });
  return Response.json({ ok: true, status: mapped });
}