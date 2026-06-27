import type { WorkflowDefinition } from "../core/workflow";
import { fetchOrder, markOrderStatus, generateInvoiceStub } from "../actions/orders.actions";
import { createIptvSubscription } from "../actions/iptv.actions";
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
        const orderId = String(ctx.payload.orderId ?? "");
        if (!orderId) throw new Error("orderId manquant dans le payload");
        const order = await fetchOrder(orderId);
        return { orderId, email: order.email, plan: order.plan_name };
      },
    },
    {
      name: "iptv:create-subscription",
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
      name: "invoice:generate",
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return generateInvoiceStub(v.orderId);
      },
    },
    {
      name: "order:mark-completed",
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