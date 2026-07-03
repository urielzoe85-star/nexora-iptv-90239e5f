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

        try {
          const { drainAutomationQueue } = await import("@/lib/automation-drainer.server");
          const result = await drainAutomationQueue({ batchSize: 10 });
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("[automation] drain failed", e?.message ?? e);
          return new Response(`drain failed: ${e?.message ?? e}`, { status: 500 });
        }
      },
    },
  },
});