import { createFileRoute } from "@tanstack/react-router";

// SebPay webhook receiver.
//
// SebPay does NOT issue a webhook signing secret, so we treat every incoming
// payload as untrusted. The webhook is only a "something changed, please
// re-check" notification — we always re-verify the transaction by calling
// SebPay's API with SEBPAY_SECRET_KEY before mutating order status. An
// attacker that POSTs a forged payload to this URL therefore cannot mark an
// order as paid; only SebPay's own API response can.
export const Route = createFileRoute("/api/public/sebpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: any;
        try { payload = JSON.parse(raw); } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        console.log("[sebpay-webhook] received", payload);

        const ref: string | undefined =
          payload.ref ?? payload.order_ref ?? payload.reference ?? payload.metadata?.reference;
        if (!ref) return new Response("Missing reference", { status: 400 });

        // Re-verify with SebPay's API; ignore status field from the payload.
        const { verifyPaymentInternal } = await import("@/lib/payments.functions");
        const result = await verifyPaymentInternal(ref);
        console.log("[sebpay-webhook] verified", { ref, status: result.status });
        return Response.json({ ok: true, status: result.status });
      },
    },
  },
});