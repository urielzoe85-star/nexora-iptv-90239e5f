/* eslint-disable @typescript-eslint/no-explicit-any -- workflow payloads are runtime-validated. */
import type { WorkflowDefinition } from "../core/workflow";
import { fetchOrder, markOrderStatus, generateInvoiceStub } from "../actions/orders.actions";
import {
  createIptvSubscription,
  composeIptvDelivery,
  dispatchIptvDelivery,
  renewIptvSubscription,
} from "../actions/iptv.actions";
import { logToIptvJournal } from "../actions/logs.actions";

function isRealPayment(ctx: { outputs: Record<string, unknown> }): boolean {
  return Boolean((ctx.outputs["validate:order"] as any)?.sandboxPayment) === false;
}

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
        const delivery = (order.metadata as any)?.iptv_delivery ?? null;
        const meta = (order.metadata ?? {}) as any;
        const paymentEnvironment = String(
          ctx.payload.paymentEnvironment ?? meta.payment_environment ?? "production",
        ).toLowerCase();
        const sandboxPayment = paymentEnvironment === "sandbox";
        if (sandboxPayment) {
          return {
            orderId,
            email: order.email,
            plan: order.plan_name,
            alreadyCompleted: false,
            isRenewal: false,
            renewalAccountId: null,
            renewalMonths: null,
            sandboxPayment: true,
          };
        }
        if (!["paid", "completed"].includes(String(order.status))) {
          throw new Error(
            `Provisioning refusé : paiement non confirmé (statut ${String(order.status)})`,
          );
        }
        const isRenewal = meta.kind === "renewal" && typeof meta.renewal_account_id === "string";
        // Ne considérer comme "déjà traité" QUE si la fiche IPTV a été
        // effectivement envoyée. Un simple status='completed' sans livraison
        // (ex. adminConfirmPayment mobile money) doit re-déclencher la chaîne.
        // Les rattrapages manuels (`forced`) ne doivent jamais être bloqués
        // par une ancienne exécution "done" restée incohérente.
        const alreadyDelivered =
          !ctx.payload.forced &&
          order.status === "completed" &&
          delivery?.delivery_status === "sent" &&
          Boolean(delivery?.iptv_account_id);
        return {
          orderId,
          email: order.email,
          plan: order.plan_name,
          alreadyCompleted: alreadyDelivered,
          isRenewal,
          renewalAccountId: isRenewal ? String(meta.renewal_account_id) : null,
          renewalMonths: isRenewal ? Number(meta.duration_months ?? 1) : null,
        };
      },
    },
    {
      // Renewal path — extend the existing IPTV account instead of provisioning
      // a brand new one. Sends a confirmation email at the end.
      name: "iptv:renew-subscription",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.isRenewal) && isRealPayment(ctx),
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as {
          orderId: string;
          email: string;
          renewalAccountId: string;
          renewalMonths: number;
        };
        const result = await renewIptvSubscription(v.renewalAccountId, v.renewalMonths || 1);
        // Fire confirmation email
        try {
          const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
          const sb = supabaseAdmin as any;
          const { data: order } = await sb
            .from("orders")
            .select("amount, currency")
            .eq("order_ref", v.orderId)
            .maybeSingle();
          const { data: acc } = await sb
            .from("iptv_accounts")
            .select("username, expires_at")
            .eq("id", v.renewalAccountId)
            .maybeSingle();
          const { sendRenewalConfirmationEmail } = await import("@/lib/portal.server");
          await sendRenewalConfirmationEmail({
            email: v.email,
            orderRef: v.orderId,
            months: v.renewalMonths || 1,
            expiresAt: acc?.expires_at ?? (result as any)?.expiresAt ?? null,
            username: acc?.username ?? null,
            amount: Number(order?.amount ?? 0),
            currency: order?.currency ?? "USD",
          });
        } catch (e) {
          console.error("[payment-confirmed] renewal email failed", e);
        }
        return result;
      },
    },
    {
      // Defensive idempotency: if the order was already completed by a
      // previous run (e.g. a manual replay), skip provisioning entirely.
      name: "guard:already-completed",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        Boolean((ctx.outputs["validate:order"] as any)?.isRenewal) === false &&
        isRealPayment(ctx),
      run: async () => ({ skipped: false }),
    },
    {
      name: "iptv:create-subscription",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        Boolean((ctx.outputs["validate:order"] as any)?.isRenewal) === false &&
        isRealPayment(ctx),
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
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        Boolean((ctx.outputs["validate:order"] as any)?.isRenewal) === false &&
        isRealPayment(ctx),
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        const sub = ctx.outputs["iptv:create-subscription"] as
          | { accountId: string | null }
          | undefined;
        return composeIptvDelivery({ orderRef: v.orderId, accountId: sub?.accountId ?? null });
      },
    },
    {
      name: "invoice:generate",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        isRealPayment(ctx),
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return generateInvoiceStub(v.orderId);
      },
    },
    {
      // Envoi automatique multi-canal de la fiche de livraison (Email +
      // Telegram si chat_id + WhatsApp si connecteur configuré). Idempotent :
      // un canal déjà envoyé n'est pas retenté sauf force=true.
      name: "delivery:dispatch",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        Boolean((ctx.outputs["validate:order"] as any)?.isRenewal) === false &&
        isRealPayment(ctx) &&
        Boolean((ctx.outputs["delivery:compose"] as any)?.iptvAccountId),
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return dispatchIptvDelivery({ orderRef: v.orderId });
      },
    },
    {
      name: "order:mark-completed",
      when: (ctx) =>
        Boolean((ctx.outputs["validate:order"] as any)?.alreadyCompleted) === false &&
        isRealPayment(ctx),
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as { orderId: string };
        return markOrderStatus(v.orderId, "completed");
      },
    },
    {
      name: "log:done",
      run: async (ctx) =>
        logToIptvJournal("payment-confirmed", "Workflow terminé", {
          runId: ctx.runId,
          outputs: ctx.outputs,
        }),
    },
    {
      name: "notify:admin",
      run: async (ctx) => {
        const v = ctx.outputs["validate:order"] as
          | { orderId: string; email: string; plan: string }
          | undefined;
        if (!v) return { skipped: true };
        const { notifyAdminTelegram } = await import("@/lib/telegram.server");
        return notifyAdminTelegram(
          `✅ Paiement confirmé\nCommande : ${v.orderId}\nPlan : ${v.plan}\nClient : ${v.email}`,
        );
      },
    },
  ],
};
