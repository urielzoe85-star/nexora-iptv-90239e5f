import type { WorkflowDefinition } from "../core/workflow";
import { setIptvSubscriptionStatus } from "../actions/iptv.actions";
import { logToIptvJournal } from "../actions/logs.actions";

export const subscriptionActivateWorkflow: WorkflowDefinition = {
  key: "subscription-activate",
  name: "Activation",
  description: "Active automatiquement un abonnement IPTV.",
  trigger: "subscription.activated",
  steps: [
    {
      name: "iptv:activate",
      run: async (ctx) => {
        const accountId = String(ctx.payload.accountId ?? "");
        if (!accountId) throw new Error("accountId manquant");
        return setIptvSubscriptionStatus(accountId, "active");
      },
    },
    {
      name: "log:done",
      run: async (ctx) => logToIptvJournal("subscription-activate", "Abonnement activé", { runId: ctx.runId }),
    },
  ],
};