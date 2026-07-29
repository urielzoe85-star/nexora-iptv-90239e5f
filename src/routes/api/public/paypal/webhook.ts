import { createFileRoute } from "@tanstack/react-router";
import { errorMessage } from "@/lib/error-message";

// PayPal channel webhook (relayed by CamerPay). Same wire format as the
// native CamerPay webhook, signed with a dedicated secret
// (`CAMERPAY_PAYPAL_WEBHOOK_SECRET`). L'ordre est tagué
// `payment_provider = 'paypal'`.
export const Route = createFileRoute("/api/public/paypal/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { processCamerpayFormattedWebhook } = await import(
          "@/lib/camerpay-webhook-handler.server"
        );
        const { camerpayWebhookSecret } = await import(
          "@/lib/payments-camerpay.server"
        );
        let secret = "";
        try { secret = camerpayWebhookSecret(); }
        catch (e: unknown) {
          console.error("[paypal-webhook] missing secret", errorMessage(e) ?? e);
          return new Response("Server misconfigured", { status: 500 });
        }
        return processCamerpayFormattedWebhook({
          request,
          secret,
          channel: "paypal",
          route: "/api/public/paypal/webhook",
        });
      },
    },
  },
});