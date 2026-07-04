import type { WorkflowDefinition } from "../core/workflow";
import { logToIptvJournal } from "../actions/logs.actions";

export const orderCreatedWorkflow: WorkflowDefinition = {
  key: "order-created",
  name: "Nouvelle commande",
  description: "Journalise la commande et prépare le traitement du paiement.",
  trigger: "order.created",
  steps: [
    {
      name: "log:order-received",
      run: async (ctx) => logToIptvJournal("order-created", "Commande reçue", ctx.payload),
    },
    {
      name: "prepare:payment-pending",
      run: async (ctx) => ({ orderId: ctx.payload.orderId ?? null, paymentExpected: true }),
    },
    {
      name: "log:workflow-complete",
      run: async (ctx) => logToIptvJournal("order-created", "Workflow terminé", { runId: ctx.runId }),
    },
    {
      name: "notify:admin",
      run: async (ctx) => {
        const { notifyAdminTelegram } = await import("@/lib/telegram.server");
        const p: any = ctx.payload ?? {};
        return notifyAdminTelegram(
          `🛒 Nouvelle commande\nRéf : ${p.orderId ?? p.orderRef ?? "?"}\nPlan : ${p.planName ?? "?"}\nEmail : ${p.email ?? "?"}`,
        );
      },
    },
  ],
};