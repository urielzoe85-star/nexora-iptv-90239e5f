// Sprint 3 · Bloc B — Backups: verification + integrity + restore drill.
//
// Called daily by pg_cron. Executes one of three modes based on the body:
//   * mode="verify" (default): capture per-table row_count + checksum
//     snapshot into backup_integrity_snapshots, compare against the
//     previous snapshot and flag suspicious drift.
//   * mode="restore_drill": pick one critical table (round-robin by day),
//     clone it in-place, compare, then drop the clone. Proves that the
//     data is exploitable end-to-end.
//   * mode="retention": prune backup_runs older than 365d (metadata only —
//     physical backups are handled by the managed platform).
//
// Every run is audited in public.backup_runs. Failed runs emit a `critical`
// security_events entry so the Telegram alert fires immediately.
//
// Auth: Bearer AUTOMATION_CRON_SECRET (shared with the other hooks — no
// new secret to onboard).

import { createFileRoute } from "@tanstack/react-router";
import { allow, clientKey, tooManyRequests } from "@/lib/rate-limit.server";

const CRITICAL_TABLES = [
  "customers",
  "orders",
  "iptv_accounts",
  "subscriptions",
  "user_roles",
  "plans",
  "products",
  "automation_workflows",
] as const;

type Mode = "verify" | "restore_drill" | "retention";

function pickDrillTable(): string {
  // Round-robin per day-of-year → every critical table is drilled at least
  // once every 8 days.
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return CRITICAL_TABLES[day % CRITICAL_TABLES.length];
}

export const Route = createFileRoute("/api/public/hooks/backup-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = allow(clientKey(request, "backup-verify"), {
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

        let body: { mode?: Mode; table?: string } = {};
        try {
          const raw = await request.text();
          body = raw ? JSON.parse(raw) : {};
        } catch { /* empty body ok */ }
        const mode: Mode = body.mode ?? "verify";

        const { supabaseAdmin } = await import(
          "@/lib/supabase-admin.server"
        );
        const { recordSecurityEvent } = await import(
          "@/lib/security-events.server"
        );
        const sb = supabaseAdmin as any;
        const startedAt = Date.now();

        const { data: runRow, error: runErr } = await sb
          .from("backup_runs")
          .insert({
            kind: mode === "verify" ? "integrity" : mode,
            status: "ok",
            summary: { mode },
          })
          .select("id")
          .single();
        if (runErr) {
          console.error("[backup-verify] cannot open run", runErr.message);
          return new Response("Cannot open run", { status: 500 });
        }
        const runId = runRow.id as string;

        try {
          let summary: Record<string, unknown> = { mode };
          let status: "ok" | "warn" | "failed" = "ok";

          if (mode === "verify") {
            // Capture new snapshot.
            const { data: cap, error: capErr } = await sb.rpc(
              "backup_capture_integrity",
              { _run_id: runId },
            );
            if (capErr) throw new Error(`capture failed: ${capErr.message}`);
            summary.captured = cap;

            // Drift detection: compare with the previous verify snapshot
            // per table. A row_count drop > 10 % without an equivalent
            // number of soft-deletes is worth investigating.
            const drift: Array<Record<string, unknown>> = [];
            for (const t of CRITICAL_TABLES) {
              const { data: prev } = await sb
                .from("backup_integrity_snapshots")
                .select("row_count, checksum, captured_at, run_id")
                .eq("table_name", t)
                .neq("run_id", runId)
                .order("captured_at", { ascending: false })
                .limit(1);
              const previous = prev?.[0];
              if (!previous) continue;
              const current = (cap?.tables ?? []).find(
                (x: any) => x.table === t,
              );
              if (!current) continue;
              const prevCount = Number(previous.row_count);
              const curCount = Number(current.row_count);
              const delta = curCount - prevCount;
              const dropRatio =
                prevCount > 0 ? (prevCount - curCount) / prevCount : 0;
              if (dropRatio > 0.1) {
                drift.push({
                  table: t,
                  previous_rows: prevCount,
                  current_rows: curCount,
                  delta,
                  drop_ratio: dropRatio,
                });
              }
            }
            summary.drift = drift;
            if (drift.length > 0) status = "warn";
          } else if (mode === "restore_drill") {
            const target = body.table && (CRITICAL_TABLES as readonly string[]).includes(body.table)
              ? body.table
              : pickDrillTable();
            const { data: drill, error: drillErr } = await sb.rpc(
              "backup_restore_drill",
              { _table: target },
            );
            if (drillErr) throw new Error(`drill failed: ${drillErr.message}`);
            summary.drill = drill;
            if (!drill?.match) {
              status = "failed";
              throw new Error(
                `restore drill mismatch on ${target}: rows ${drill?.source_rows} vs ${drill?.restored_rows}`,
              );
            }
          } else if (mode === "retention") {
            const cutoff = new Date(
              Date.now() - 365 * 24 * 60 * 60 * 1000,
            ).toISOString();
            const { count } = await sb
              .from("backup_runs")
              .delete({ count: "exact" })
              .lt("started_at", cutoff);
            summary.pruned = count ?? 0;
          }

          const finished = new Date();
          await sb
            .from("backup_runs")
            .update({
              status,
              finished_at: finished.toISOString(),
              duration_ms: Date.now() - startedAt,
              summary,
            })
            .eq("id", runId);

          if (status === "warn") {
            await recordSecurityEvent({
              event_type: "backup.drift_detected",
              severity: "warn",
              route: "/api/public/hooks/backup-verify",
              message: `Backup verify detected drift on ${
                (summary.drift as unknown[]).length
              } table(s)`,
              payload: summary,
            });
          }

          return new Response(
            JSON.stringify({ ok: true, run_id: runId, status, summary }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const message = (err as Error).message ?? String(err);
          await sb
            .from("backup_runs")
            .update({
              status: "failed",
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt,
              error: message,
            })
            .eq("id", runId);
          await recordSecurityEvent({
            event_type: "backup.failure",
            severity: "critical",
            route: "/api/public/hooks/backup-verify",
            message: `Backup ${mode} FAILED: ${message}`,
            payload: { run_id: runId, mode },
          });
          return new Response(
            JSON.stringify({ ok: false, run_id: runId, error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});