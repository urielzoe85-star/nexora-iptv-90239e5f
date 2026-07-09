import { createFileRoute } from "@tanstack/react-router";

// Stripe channel webhook (relayed by CamerPay).
//
// CamerPay agrège Stripe côté passerelle. Après un paiement carte, il POSTe
// vers cette URL avec le format CamerPay standard (form-urlencoded, HMAC-SHA256
// sur `uuid|invoice_id|status|amount`), mais signé avec un secret dédié
// (`CAMERPAY_STRIPE_WEBHOOK_SECRET`) que l'admin colle dans le dashboard
// CamerPay. L'ordre est mis à jour avec `payment_provider = 'stripe'`.
export const Route = createFileRoute("/api/public/stripe/webhook")({
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
        catch (e: any) {
          console.error("[stripe-webhook] missing secret", e?.message ?? e);
          return new Response("Server misconfigured", { status: 500 });
        }
        return processCamerpayFormattedWebhook({
          request,
          secret,
          channel: "stripe",
          route: "/api/public/stripe/webhook",
        });
      },
    },
  },
});