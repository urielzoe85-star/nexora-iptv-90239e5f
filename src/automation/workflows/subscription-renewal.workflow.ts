import type { WorkflowDefinition } from "../core/workflow";
import { renewIptvSubscription } from "../actions/iptv.actions";
import { logToIptvJournal } from "../actions/logs.actions";

export const subscriptionRenewalWorkflow: WorkflowDefinition = {
  key: "subscription-renewal",
  name: "Renouvellement",
  description: "Prolonge l'abonnement IPTV via MEGAOTT et met à jour l'expiration.",
  trigger: "subscription.renewed",
  steps: [
    {
      name: "iptv:renew",
      run: async (ctx) => {
        const accountId = String(ctx.payload.accountId ?? "");
        if (!accountId) throw new Error("accountId manquant");
        return renewIptvSubscription(accountId, Number(ctx.payload.months ?? 1));
      },
    },
    {
      name: "log:done",
      run: async (ctx) => logToIptvJournal("subscription-renewal", "Renouvellement effectué", { runId: ctx.runId, outputs: ctx.outputs }),
    },
  ],
};