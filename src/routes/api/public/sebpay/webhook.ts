import { createFileRoute } from "@tanstack/react-router";
import { verifyHmac } from "@/integration-hub/webhooks/signatures";

// Persist a webhook receipt to `integration_debug_logs` so signature failures,
// replays, and processing errors survive Worker log rotation. Best-effort —
// never break the webhook ack on a logging failure.
async function logWebhook(row: {
  ok: boolean;
  status: number;
  ref?: string | null;
  signatureValid?: boolean;
  rawPreview?: string;
  payloadPreview?: unknown;
  error?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("integration_debug_logs").insert({
      connector_id: "payment.sebpay",
      operation: "webhook",
      method: "POST",
      url: "/api/public/sebpay/webhook",
      status: row.status,
      ok: row.ok,
      attempts: 1,
      request_body: row.payloadPreview
        ? { ref: row.ref, payload: row.payloadPreview }
        : { ref: row.ref ?? null, raw: row.rawPreview ?? null },
      response_body: row.signatureValid === undefined
        ? { error: row.error ?? null }
        : { signature_valid: row.signatureValid, error: row.error ?? null },
      error: row.error ?? null,
    });
  } catch (e) {
    console.error("[sebpay-webhook] log persistence failed", e);
  }
}

// SebPay webhook receiver.
//
// SebPay signs each callback with HMAC-SHA256 of the raw JSON body using our
// SEBPAY_SECRET_KEY (sk_live_...), and sends the hex digest in the
// `X-SebPay-Signature` header. We MUST verify the signature before doing
// anything with the payload. After verification we still re-query SebPay's
// API (defense in depth) so order state can only ever come from SebPay.
// Responses are returned within milliseconds with HTTP 200 to satisfy the
// documented 5s timeout, and processing is idempotent (verifyPaymentInternal
// is a no-op once the order has reached a terminal state).
export const Route = createFileRoute("/api/public/sebpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        // ---- 1. Verify HMAC-SHA256 signature ------------------------------
        const signatureHeader =
          request.headers.get("x-sebpay-signature") ??
          request.headers.get("X-SebPay-Signature") ??
          "";
        const secret = (process.env.SEBPAY_SECRET_KEY ?? "")
          .trim()
          .replace(/^['"]|['"]$/g, "");
        if (!secret) {
          console.error("[sebpay-webhook] missing SEBPAY_SECRET_KEY");
          await logWebhook({ ok: false, status: 500, error: "missing SEBPAY_SECRET_KEY", rawPreview: raw.slice(0, 200) });
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signatureHeader) {
          console.warn("[sebpay-webhook] missing X-SebPay-Signature header");
          await logWebhook({ ok: false, status: 401, error: "missing signature header", rawPreview: raw.slice(0, 200) });
          const { recordSecurityEvent, extractRequestMeta } = await import("@/lib/security-events.server");
          const meta = extractRequestMeta(request);
          await recordSecurityEvent({
            event_type: "webhook.sebpay.signature_missing",
            severity: "warn",
            route: "/api/public/sebpay/webhook",
            ip: meta.ip,
            user_agent: meta.user_agent,
            message: "SebPay webhook rejected: missing X-SebPay-Signature header",
          });
          return new Response("Missing signature", { status: 401 });
        }
        const signatureValid = verifyHmac(secret, raw, signatureHeader);
        if (!signatureValid) {
          console.warn("[sebpay-webhook] invalid signature", {
            providedLength: signatureHeader.trim().length,
          });
          await logWebhook({
            ok: false, status: 401, signatureValid: false,
            error: "invalid signature", rawPreview: raw.slice(0, 200),
          });
          const { recordSecurityEvent, extractRequestMeta } = await import("@/lib/security-events.server");
          const meta = extractRequestMeta(request);
          await recordSecurityEvent({
            event_type: "webhook.sebpay.signature_invalid",
            severity: "critical",
            route: "/api/public/sebpay/webhook",
            ip: meta.ip,
            user_agent: meta.user_agent,
            message: "SebPay webhook rejected: HMAC signature mismatch",
            payload: { provided_length: signatureHeader.trim().length },
          });
          return new Response("Invalid signature", { status: 401 });
        }

        // ---- 2. Parse payload ---------------------------------------------
        let payload: any;
        try { payload = JSON.parse(raw); } catch {
          await logWebhook({ ok: false, status: 400, signatureValid: true, error: "bad JSON", rawPreview: raw.slice(0, 200) });
          return new Response("Bad JSON", { status: 400 });
        }
        console.log("[sebpay-webhook] received", {
          transaction_id: payload?.transaction_id,
          external_reference: payload?.external_reference,
          status: payload?.status,
          currency: payload?.currency,
        });

        // SebPay's documented webhook body uses external_reference (the value
        // we sent at creation time) — we accept a few aliases just in case.
        const d = payload.data ?? payload;
        const ref: string | undefined =
          d.external_reference ?? d.reference ?? d.order_ref ?? d.ref ?? payload.metadata?.reference;
        if (!ref) {
          await logWebhook({ ok: false, status: 400, signatureValid: true, error: "missing external_reference", payloadPreview: d });
          return new Response("Missing external_reference", { status: 400 });
        }

        // ---- 3. Re-verify via SebPay API (idempotent) ---------------------
        // verifyPaymentInternal short-circuits when the order is already in a
        // terminal state (paid / failed / cancelled), so replayed webhooks
        // are safe to process multiple times.
        let processingError: string | null = null;
        let resultStatus: string | null = null;
        try {
          const { verifyPaymentInternal } = await import("@/lib/payments.functions");
          const result = await verifyPaymentInternal(ref);
          resultStatus = result.status;
          console.log("[sebpay-webhook] verified", { ref, status: result.status });
        } catch (err) {
          // Always ACK with 200 so SebPay doesn't retry-storm; processing
          // errors are logged and can be reconciled out-of-band.
          console.error("[sebpay-webhook] processing error", err);
          processingError = String((err as any)?.message ?? err);
        }
        await logWebhook({
          ok: !processingError,
          status: 200,
          ref,
          signatureValid: true,
          payloadPreview: { transaction_id: d.transaction_id, status: d.status, currency: d.currency, resultStatus },
          error: processingError,
        });
        return Response.json({ ok: true });
      },
    },
  },
});