// Sprint 3 · Bloc E — Secret rotation scan wake endpoint.
//
// Idempotent HTTP entry point that calls `public.secret_registry_scan()`
// (SECURITY DEFINER, Sprint 2 · Bloc F). The daily pg_cron
// `secret-registry-scan-daily` already runs at 06:00 UTC — this endpoint
// lets on-call operators (or a GitHub Action) force a scan and get the
// summary back synchronously.
//
// Auth: Bearer AUTOMATION_CRON_SECRET (shared with the other hooks).
// Rate: 12 req / 10 min / IP.

import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

export const Route = createFileRoute(
  "/api/public/hooks/secret-rotation-check",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = allow(clientKey(request, "secret-rotation-check"), {
          limit: 12,
          windowMs: 10 * 60_000,
        });
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

        try {
          const { supabaseAdmin } = await import(
            "@/lib/supabase-admin.server"
          );
          const sb = supabaseAdmin as any;
          const { data, error } = await sb.rpc("secret_registry_scan");
          if (error) {
            return new Response(
              JSON.stringify({ ok: false, error: error.message }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(
            JSON.stringify({ ok: true, summary: data }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const message = (err as Error).message ?? String(err);
          return new Response(
            JSON.stringify({ ok: false, error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});