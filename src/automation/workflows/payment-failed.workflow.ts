import type { WorkflowDefinition } from "../core/workflow";
import { markOrderStatus } from "../actions/orders.actions";
import { logToIptvJournal } from "../actions/logs.actions";

export const paymentFailedWorkflow: WorkflowDefinition = {
  key: "payment-failed",
  name: "Paiement échoué",
  description: "Annule la commande et journalise l'incident.",
  trigger: "payment.failed",
  steps: [
    {
      name: "order:mark-cancelled",
      when: (ctx) => Boolean(ctx.payload.orderId),
      run: async (ctx) => markOrderStatus(String(ctx.payload.orderId), "cancelled"),
    },
    {
      name: "log:incident",
      run: async (ctx) => logToIptvJournal("payment-failed", "Paiement échoué", ctx.payload),
    },
  ],
};