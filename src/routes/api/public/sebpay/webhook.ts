import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

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
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signatureHeader) {
          console.warn("[sebpay-webhook] missing X-SebPay-Signature header");
          return new Response("Missing signature", { status: 401 });
        }
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const provided = signatureHeader.trim().toLowerCase();
        const expectedLc = expected.toLowerCase();
        let signatureValid = false;
        try {
          const a = Buffer.from(provided, "utf8");
          const b = Buffer.from(expectedLc, "utf8");
          signatureValid = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          signatureValid = false;
        }
        if (!signatureValid) {
          console.warn("[sebpay-webhook] invalid signature", {
            providedLength: provided.length,
            expectedLength: expectedLc.length,
          });
          return new Response("Invalid signature", { status: 401 });
        }

        // ---- 2. Parse payload ---------------------------------------------
        let payload: any;
        try { payload = JSON.parse(raw); } catch {
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
        if (!ref) return new Response("Missing external_reference", { status: 400 });

        // ---- 3. Re-verify via SebPay API (idempotent) ---------------------
        // verifyPaymentInternal short-circuits when the order is already in a
        // terminal state (paid / failed / cancelled), so replayed webhooks
        // are safe to process multiple times.
        try {
          const { verifyPaymentInternal } = await import("@/lib/payments.functions");
          const result = await verifyPaymentInternal(ref);
          console.log("[sebpay-webhook] verified", { ref, status: result.status });
        } catch (err) {
          // Always ACK with 200 so SebPay doesn't retry-storm; processing
          // errors are logged and can be reconciled out-of-band.
          console.error("[sebpay-webhook] processing error", err);
        }
        return Response.json({ ok: true });
      },
    },
  },
});