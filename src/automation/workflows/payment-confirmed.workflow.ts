import type { WorkflowDefinition } from "../core/workflow";
import { fetchOrder, markOrderStatus, generateInvoiceStub } from "../actions/orders.actions";
import { createIptvSubscription, composeIptvDelivery } from "../actions/iptv.actions";
import { logToIptvJournal } from "../actions/logs.actions";

export const paymentConfirmedWorkflow: WorkflowDefinition = {
  key: "payment-confirmed",
  name: "Paiement confirmé",
  description: "Crée l'abonnement IPTV via MEGAOTT (Integration Hub) et finalise la commande.",
  trigger: "payment.confirmed",
  steps: [
    {
      name: "validate:order",
      run: async (ctx) => {
        const orderId = String(ctx.payload.orderId ?? ctx.payload.orderRef ?? "");
        if (!orderId) throw new Error("orderId/orderRef manquant dans le payload");
        const order = await fetchOrder(orderId);
        return {
          orderId,
          email: order.email,
          plan: order.plan_name,
          alreadyCompleted: order.status === "completed",
        };
      },
    },
    {
      // Defensive idempotency: if the order was already completed by a
      // previous run (e.g. a manual replay), skip provisioning entirely.
      name: "guard:already-completed",
      when: (ctx) => Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false,
      run: async () => ({ skipped: false }),
    },
    {
      name: "iptv:create-subscription",
      when: (ctx) => Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false,
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string; email: string };
        return createIptvSubscription({
          customerEmail: v.email,
          orderId: v.orderId,
          durationMonths: Number(ctx.payload.durationMonths ?? 1),
        });
      },
    },
    {
      // Bridge provisioning → delivery: fills orders.metadata.iptv_delivery
      // and inserts a delivery_logs row (channel=email, status=prepared) so
      // the delivery pipeline (or a human operator) can dispatch it.
      name: "delivery:compose",
      when: (ctx) => Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false,
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        const sub = ctx.outputs["iptv:create-subscription"] as { accountId: string | null } | undefined;
        return composeIptvDelivery({ orderRef: v.orderId, accountId: sub?.accountId ?? null });
      },
    },
    {
      name: "invoice:generate",
      when: (ctx) => Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false,
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return generateInvoiceStub(v.orderId);
      },
    },
    {
      name: "order:mark-completed",
      when: (ctx) => Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false,
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return markOrderStatus(v.orderId, "completed");
      },
    },
    {
      name: "log:done",
      run: async (ctx) => logToIptvJournal("payment-confirmed", "Workflow terminé", { runId: ctx.runId, outputs: ctx.outputs }),
    },
  ],
};