// Sprint 3 · Bloc F — SLO snapshot endpoint.
//
// Idempotent GET that returns a JSON snapshot of the current SLO
// indicators derived from `security_events` + queue counters. Consumed
// by an external dashboard (Grafana / Metabase) or by on-call scripts.
//
// Auth: Bearer AUTOMATION_CRON_SECRET. Rate: 30 req / 5 min / IP.

import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

const WINDOW_MS = 60 * 60_000; // last hour

export const Route = createFileRoute("/api/public/hooks/slo-snapshot")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rl = allow(clientKey(request, "slo-snapshot"), {
          limit: 30,
          windowMs: 5 * 60_000,
        });
        if (!rl.ok) return tooManyRequests(rl);

        const expected = process.env.AUTOMATION_CRON_SECRET ?? "";
        if (!expected) return new Response("Server misconfigured", { status: 500 });
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        if (!token || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import(
            "@/lib/supabase-admin.server"
          );
          const sb = supabaseAdmin as any;
          const since = new Date(Date.now() - WINDOW_MS).toISOString();

          const [{ data: errEvents }, { data: warnEvents }, { count: queueDepth }] =
            await Promise.all([
              sb.from("security_events")
                .select("event_type,severity,created_at")
                .gte("created_at", since)
                .eq("severity", "critical"),
              sb.from("security_events")
                .select("event_type,severity,created_at")
                .gte("created_at", since)
                .eq("severity", "warn"),
              sb.from("automation_queue")
                .select("id", { count: "exact", head: true })
                .in("status", ["pending", "processing"]),
            ]);

          const snapshot = {
            window_ms: WINDOW_MS,
            generated_at: new Date().toISOString(),
            errors_critical_last_hour: errEvents?.length ?? 0,
            errors_warn_last_hour: warnEvents?.length ?? 0,
            queue_depth: queueDepth ?? 0,
            slo: {
              error_rate_target_pct: 0.5,
              queue_drain_target_s: 30,
              checkout_p95_target_ms: 800,
            },
          };
          return Response.json({ ok: true, snapshot });
        } catch (err) {
          return new Response(
            JSON.stringify({ ok: false, error: (err as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});