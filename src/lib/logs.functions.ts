// Server fns — Journal système. Fusionne security_events, automation_runs, iptv_logs.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export type LogRow = {
  ts: string;
  severity: "info" | "warn" | "critical" | "error";
  source: "security" | "automation" | "iptv";
  message: string;
  actor: string | null;
  ref: string | null;
};

export const getSystemLogs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      search: z.string().trim().max(200).optional(),
      severity: z.enum(["all", "info", "warn", "critical", "error"]).default("all"),
      source: z.enum(["all", "security", "automation", "iptv"]).default("all"),
      limit: z.number().int().min(10).max(500).default(200),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const limit = data.limit;
    const rows: LogRow[] = [];

    if (data.source === "all" || data.source === "security") {
      const { data: r } = await supabaseAdmin
        .from("security_events")
        .select("created_at, severity, event_type, message, actor_email, request_id")
        .order("created_at", { ascending: false })
        .limit(limit);
      for (const e of r ?? []) {
        rows.push({
          ts: e.created_at,
          severity: (e.severity as any) || "info",
          source: "security",
          message: `[${e.event_type}] ${e.message}`,
          actor: e.actor_email ?? null,
          ref: e.request_id ?? null,
        });
      }
    }

    if (data.source === "all" || data.source === "automation") {
      const { data: r } = await supabaseAdmin
        .from("automation_runs")
        .select("created_at, status, workflow_key, trigger_event, error, id")
        .order("created_at", { ascending: false })
        .limit(limit);
      for (const e of r ?? []) {
        const failed = e.status === "failed" || e.status === "error";
        rows.push({
          ts: e.created_at,
          severity: failed ? "error" : e.status === "processing" ? "info" : "info",
          source: "automation",
          message: `[${e.workflow_key}] ${e.status}${e.error ? ` — ${e.error}` : ""}${e.trigger_event ? ` (${e.trigger_event})` : ""}`,
          actor: null,
          ref: e.id,
        });
      }
    }

    if (data.source === "all" || data.source === "iptv") {
      const { data: r } = await supabaseAdmin
        .from("iptv_logs")
        .select("created_at, action, message, account_id, id")
        .order("created_at", { ascending: false })
        .limit(limit);
      for (const e of r ?? []) {
        rows.push({
          ts: e.created_at,
          severity: "info",
          source: "iptv",
          message: `[${e.action}] ${e.message ?? ""}`.trim(),
          actor: null,
          ref: e.account_id ?? e.id,
        });
      }
    }

    let filtered = rows;
    if (data.severity !== "all") {
      filtered = filtered.filter((r) =>
        data.severity === "error" ? (r.severity === "error" || r.severity === "critical") : r.severity === data.severity,
      );
    }
    if (data.search) {
      const s = data.search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.message.toLowerCase().includes(s) || (r.actor ?? "").toLowerCase().includes(s) || (r.ref ?? "").toLowerCase().includes(s),
      );
    }
    filtered.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return filtered.slice(0, limit);
  });