// Drainage de la file d'attente automation. Appelé par pg_cron toutes
// les minutes avec l'apikey anon. La logique métier s'exécute via
// supabaseAdmin (service-role) chargé dynamiquement.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/automation/process-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // The queue drain is invoked by pg_cron with a shared secret in the
        // Authorization: Bearer header. The previous gate accepted the public
        // anon key (shipped in every client bundle), so anyone could trigger
        // a drain — replace it with a dedicated server-only secret.
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

        await import("@/automation");
        const { automationApi } = await import("@/automation");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sb = supabaseAdmin as any;

        const { data: jobs } = await sb
          .from("automation_queue")
          .select("id, workflow_key, payload, trigger_event, attempts, max_attempts")
          .eq("status", "queued")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(10);

        const processed: Array<{ id: string; status: string; error?: string | null }> = [];
        for (const job of (jobs ?? []) as Array<{ id: string; workflow_key: string; payload: any; trigger_event: string | null; attempts: number; max_attempts: number }>) {
          await sb.from("automation_queue").update({ status: "processing", locked_at: new Date().toISOString(), attempts: job.attempts + 1 }).eq("id", job.id);
          try {
            const r = await automationApi.run(job.workflow_key, job.payload ?? {}, null);
            if (r.status === "success") {
              await sb.from("automation_queue").update({ status: "done" }).eq("id", job.id);
              processed.push({ id: job.id, status: "done" });
            } else {
              const failed = job.attempts + 1 >= job.max_attempts;
              await sb.from("automation_queue").update({
                status: failed ? "failed" : "queued",
                last_error: r.error ?? "workflow failed",
              }).eq("id", job.id);
              processed.push({ id: job.id, status: failed ? "failed" : "retry", error: r.error });
            }
          } catch (e: any) {
            const failed = job.attempts + 1 >= job.max_attempts;
            await sb.from("automation_queue").update({
              status: failed ? "failed" : "queued",
              last_error: String(e?.message ?? e),
            }).eq("id", job.id);
            processed.push({ id: job.id, status: failed ? "failed" : "retry", error: String(e?.message ?? e) });
          }
        }

        return Response.json({ ok: true, processed });
      },
    },
  },
});