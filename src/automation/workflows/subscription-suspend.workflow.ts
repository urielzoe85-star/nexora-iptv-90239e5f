import type { WorkflowDefinition } from "../core/workflow";
import { setIptvSubscriptionStatus } from "../actions/iptv.actions";
import { logToIptvJournal } from "../actions/logs.actions";

export const subscriptionSuspendWorkflow: WorkflowDefinition = {
  key: "subscription-suspend",
  name: "Suspension",
  description: "Suspend automatiquement un abonnement IPTV.",
  trigger: "subscription.suspended",
  steps: [
    {
      name: "iptv:suspend",
      run: async (ctx) => {
        const accountId = String(ctx.payload.accountId ?? "");
        if (!accountId) throw new Error("accountId manquant");
        return setIptvSubscriptionStatus(accountId, "suspended");
      },
    },
    {
      name: "log:done",
      run: async (ctx) => logToIptvJournal("subscription-suspend", "Abonnement suspendu", { runId: ctx.runId }),
    },
  ],
};