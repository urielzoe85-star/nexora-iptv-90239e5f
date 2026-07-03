// Sprint 3 · Bloc A — Renewal reminders cron endpoint.
//
// Scans public.iptv_accounts for expirations at J-7 / J-3 / J-1 and enqueues
// a reminder email per (account, milestone). Idempotent via the
// public.renewal_reminders_sent table (unique on account_id + milestone).
//
// Auth: Bearer AUTOMATION_CRON_SECRET (same secret as the automation drain
// cron — no new secret to onboard). Called daily by pg_cron.

import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

type Milestone = 7 | 3 | 1;
const MILESTONES: Milestone[] = [7, 3, 1];

export const Route = createFileRoute("/api/public/hooks/renewal-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Local rate-limit: 6 legitimate cron pulses per 10 min are plenty
        // (daily cron + manual retries). Blocks accidental retry storms.
        const rl = allow(clientKey(request, "renewal-reminders"), { limit: 6, windowMs: 10 * 60_000 });
        if (!rl.ok) return tooManyRequests(rl);

        const expected = process.env.AUTOMATION_CRON_SECRET ?? "";
        if (!expected) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        if (!token || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        const sb = supabaseAdmin as any;

        const results: Array<{ milestone: Milestone; scanned: number; enqueued: number }> = [];

        for (const milestone of MILESTONES) {
          const target = new Date();
          target.setUTCHours(0, 0, 0, 0);
          target.setUTCDate(target.getUTCDate() + milestone);
          const dayStart = target.toISOString();
          const dayEndDate = new Date(target);
          dayEndDate.setUTCDate(dayEndDate.getUTCDate() + 1);
          const dayEnd = dayEndDate.toISOString();

          const { data: accounts, error } = await sb
            .from("iptv_accounts")
            .select("id, customer_id, username, expires_at, status")
            .eq("status", "active")
            .not("customer_id", "is", null)
            .gte("expires_at", dayStart)
            .lt("expires_at", dayEnd);

          if (error) {
            console.error("[renewal-reminders] scan failed", milestone, error.message);
            continue;
          }
          const list = accounts ?? [];
          let enqueued = 0;

          for (const acc of list) {
            // Idempotence: unique (account_id, milestone_days, expires_at).
            // A renewed subscription gets a new expires_at, so the next
            // cycle's J-7/J-3/J-1 milestones can send again — as intended.
            const { error: insErr } = await sb
              .from("renewal_reminders_sent")
              .insert({
                account_id: acc.id,
                milestone_days: milestone,
                expires_at: acc.expires_at,
              });
            if (insErr) {
              // 23505 = unique violation → already sent, skip silently.
              if ((insErr as any).code !== "23505") {
                console.error("[renewal-reminders] idempotency insert failed", insErr.message);
              }
              continue;
            }

            // Look up recipient email + preferred locale from the customer.
            const { data: cust } = await sb
              .from("customers")
              .select("email, full_name, metadata")
              .eq("id", acc.customer_id)
              .maybeSingle();
            const recipient = cust?.email as string | undefined;
            const locale = (cust?.metadata?.locale as string | undefined) ?? "fr";
            if (!recipient) {
              console.warn("[renewal-reminders] no email for account", acc.id);
              continue;
            }

            const { error: qErr } = await sb.rpc("enqueue_email", {
              queue_name: "q_transactional_emails",
              payload: {
                template: "iptv-renewal-reminder",
                to_user_id: acc.customer_id,
                to: recipient,
                data: {
                  client_name: cust?.full_name ?? "",
                  username: acc.username,
                  expires_at: acc.expires_at,
                  days_left: milestone,
                  locale,
                },
              },
            });
            if (qErr) {
              console.error("[renewal-reminders] enqueue failed", qErr.message);
              continue;
            }
            // Audit transition Active → Expiring Soon (informational, not a
            // status change on the account itself).
            try {
              await sb.from("iptv_lifecycle_events").insert({
                account_id: acc.id,
                from_state: acc.status,
                to_state: "expiring_soon",
                reason: `reminder_j${milestone}`,
                actor: "cron",
                metadata: { expires_at: acc.expires_at, milestone_days: milestone },
              });
            } catch { /* audit is best-effort */ }
            enqueued += 1;
          }

          results.push({ milestone, scanned: list.length, enqueued });
        }

        return new Response(
          JSON.stringify({ ok: true, results, ran_at: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});