// Sprint 3 · Bloc A — Dunning cron endpoint.
//
// Scans failed/unpaid orders and dispatches relance emails at J+1 / J+3 /
// J+7 since the payment failure. At J+7, additionally suspends every IPTV
// account attached to the order (audited into iptv_lifecycle_events).
//
// Idempotence: unique (order_id, milestone_days, failed_at) on
// public.payment_dunning_sent — no client can ever receive two identical
// dunning emails for the same failure. Auth: Bearer AUTOMATION_CRON_SECRET.

import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

type Milestone = 1 | 3 | 7;
const MILESTONES: Milestone[] = [1, 3, 7];

export const Route = createFileRoute("/api/public/hooks/payment-dunning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = allow(clientKey(request, "payment-dunning"), { limit: 6, windowMs: 10 * 60_000 });
        if (!rl.ok) return tooManyRequests(rl);

        const expected = process.env.AUTOMATION_CRON_SECRET ?? "";
        if (!expected) return new Response("Server misconfigured", { status: 500 });
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token || token !== expected) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { suspendAccount } = await import("@/lib/billing.server");
        const sb = supabaseAdmin as any;

        const now = Date.now();
        const results: Array<{ milestone: Milestone; scanned: number; enqueued: number; suspended: number }> = [];

        for (const milestone of MILESTONES) {
          // Target window = orders that failed ~milestone days ago
          // (bucket = the 24h window centred on failed_at ± 12h)
          const targetStart = new Date(now - (milestone + 0.5) * 86400_000).toISOString();
          const targetEnd   = new Date(now - (milestone - 0.5) * 86400_000).toISOString();

          const { data: orders, error } = await sb
            .from("orders")
            .select("id, reference, customer_id, amount_cents, currency, status, updated_at")
            .in("status", ["failed", "payment_failed", "unpaid"])
            .gte("updated_at", targetStart)
            .lt("updated_at", targetEnd);
          if (error) {
            console.error("[payment-dunning] scan failed", milestone, error.message);
            continue;
          }
          const list = orders ?? [];
          let enqueued = 0;
          let suspended = 0;

          for (const ord of list) {
            const { error: insErr } = await sb.from("payment_dunning_sent").insert({
              order_id: ord.id,
              customer_id: ord.customer_id,
              milestone_days: milestone,
              failed_at: ord.updated_at,
            });
            if (insErr) {
              if ((insErr as any).code !== "23505") {
                console.error("[payment-dunning] idempotency failed", insErr.message);
              }
              continue;
            }

            const { data: cust } = await sb
              .from("customers")
              .select("email, full_name, metadata")
              .eq("id", ord.customer_id)
              .maybeSingle();
            const recipient = cust?.email as string | undefined;
            const locale = (cust?.metadata?.locale as string | undefined) ?? "fr";

            if (recipient) {
              const { error: qErr } = await sb.rpc("enqueue_email", {
                queue_name: "q_transactional_emails",
                payload: {
                  template: "payment-failed",
                  to_user_id: ord.customer_id,
                  to: recipient,
                  data: {
                    client_name: cust?.full_name ?? "",
                    order_ref: ord.reference,
                    amount: ord.amount_cents ? (ord.amount_cents / 100).toFixed(2) : undefined,
                    currency: ord.currency ?? "EUR",
                    days_since_failure: milestone,
                    locale,
                  },
                },
              });
              if (qErr) console.error("[payment-dunning] enqueue failed", qErr.message);
              else enqueued += 1;
            }

            // J+7 → automatic suspension of every account attached to the order.
            if (milestone === 7) {
              const { data: accts } = await sb
                .from("iptv_accounts").select("id").eq("order_id", ord.id);
              for (const a of (accts ?? []) as Array<{ id: string }>) {
                const ok = await suspendAccount(a.id, "dunning_j7_auto_suspend", { order_id: ord.id });
                if (ok) suspended += 1;
              }
            }
          }
          results.push({ milestone, scanned: list.length, enqueued, suspended });
        }

        return Response.json({ ok: true, results, ran_at: new Date().toISOString() });
      },
    },
  },
});