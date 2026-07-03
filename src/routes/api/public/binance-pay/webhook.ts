import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

// Persist a webhook receipt to `integration_debug_logs` so signature failures,
// replays, and processing errors survive Worker log rotation.
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
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("integration_debug_logs").insert({
      connector_id: "payment.binance_pay",
      operation: "webhook",
      method: "POST",
      url: "/api/public/binance-pay/webhook",
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
    console.error("[binance-webhook] log persistence failed", e);
  }
}

// Binance Pay webhook receiver.
//
// Binance signs each callback with RSA-SHA256 over
// `${BinancePay-Timestamp}\n${BinancePay-Nonce}\n${rawBody}\n`, base64-encoded
// in the `BinancePay-Signature` header. We verify the signature before doing
// anything with the payload, then re-query Binance's API (defense in depth)
// so order state can only come from Binance.
export const Route = createFileRoute("/api/public/binance-pay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = allow(clientKey(request, "binance-pay-webhook"), { limit: 60, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl);

        const raw = await request.text();

        // ---- 1. Verify RSA-SHA256 signature ------------------------------
        const { verifyBinancePayWebhook } = await import("@/lib/payments-binance.server");
        const signatureValid = verifyBinancePayWebhook(raw, request.headers);
        if (!signatureValid) {
          console.warn("[binance-webhook] invalid signature");
          await logWebhook({
            ok: false, status: 401, signatureValid: false,
            error: "invalid signature", rawPreview: raw.slice(0, 200),
          });
          const { recordSecurityEvent, extractRequestMeta } = await import("@/lib/security-events.server");
          const meta = extractRequestMeta(request);
          await recordSecurityEvent({
            event_type: "webhook.binance_pay.signature_invalid",
            severity: "critical",
            route: "/api/public/binance-pay/webhook",
            ip: meta.ip,
            user_agent: meta.user_agent,
            request_id: meta.request_id,
            message: "Binance Pay webhook rejected: RSA signature mismatch or missing headers",
          });
          // Binance ACKs are content-agnostic; return 401 to signal invalid.
          return new Response("Invalid signature", { status: 401 });
        }

        // ---- 2. Parse payload --------------------------------------------
        let payload: any;
        try { payload = JSON.parse(raw); } catch {
          await logWebhook({ ok: false, status: 400, signatureValid: true, error: "bad JSON", rawPreview: raw.slice(0, 200) });
          return new Response("Bad JSON", { status: 400 });
        }
        // Binance Pay wraps the business payload as a stringified JSON in `data`.
        let inner: any = {};
        try { inner = payload.data ? JSON.parse(payload.data) : payload; } catch { inner = payload; }
        const ref: string | undefined = inner.merchantTradeNo ?? payload.merchantTradeNo;
        const bizStatus: string | undefined = payload.bizStatus ?? inner.bizStatus;

        console.log("[binance-webhook] received", {
          bizStatus, merchantTradeNo: ref,
          transactionId: inner.transactionId,
        });

        if (!ref) {
          await logWebhook({ ok: false, status: 400, signatureValid: true, error: "missing merchantTradeNo", payloadPreview: inner });
          return new Response("Missing merchantTradeNo", { status: 400 });
        }

        // ---- 3. Re-verify via Binance API (idempotent) --------------------
        let processingError: string | null = null;
        let resultStatus: string | null = null;
        try {
          const { verifyBinancePayInternal } = await import("@/lib/payments.functions");
          const result = await verifyBinancePayInternal(ref);
          resultStatus = result.status;
          console.log("[binance-webhook] verified", { ref, status: result.status });
        } catch (err) {
          console.error("[binance-webhook] processing error", err);
          processingError = String((err as any)?.message ?? err);
        }

        await logWebhook({
          ok: !processingError,
          status: 200,
          ref,
          signatureValid: true,
          payloadPreview: { bizStatus, transactionId: inner.transactionId, resultStatus },
          error: processingError,
        });
        // Binance expects `{ returnCode: "SUCCESS" }` to stop retries.
        return Response.json({ returnCode: "SUCCESS", returnMessage: null });
      },
    },
  },
});