// Server functions du moteur d'automatisation. Admin uniquement.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ok, error } = await (supabaseAdmin as any).rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    await import("@/automation");
    const { workflowRegistry } = await import("@/automation/core/registry");
    const { data } = await sb.from("automation_workflows").select("*").order("name");
    const rows = (data ?? []) as Array<{ key: string; name: string; enabled: boolean; trigger_event: string; description: string | null; id: string }>;
    const defs = workflowRegistry.list();
    return rows.map((r) => {
      const def = defs.find((d) => d.key === r.key);
      return { ...r, steps: def?.steps.length ?? 0 };
    });
  });

export const toggleWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("automation_workflows").update({ enabled: data.enabled }).eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runWorkflowManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string(), payload: z.record(z.unknown()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const { automationApi } = await import("@/automation");
    const r = await automationApi.run(data.key, data.payload ?? {}, context.userId);
    return { runId: r.runId, status: r.status, error: r.error ?? null };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.string().optional(), workflow: z.string().optional(), limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("automation_runs").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 50);
    if (data.status) q = q.eq("status", data.status);
    if (data.workflow) q = q.eq("workflow_key", data.workflow);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: run, error } = await sb.from("automation_runs").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: steps } = await sb.from("automation_steps").select("*").eq("run_id", data.id).order("step_index");
    return { run, steps: steps ?? [] };
  });

export const replayRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const { automationApi } = await import("@/automation");
    const r = await automationApi.replay(data.id);
    return { runId: r.runId, status: r.status, error: r.error ?? null };
  });

export const getAutomationKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [active, runs24, errors24, queued, durations] = await Promise.all([
      sb.from("automation_workflows").select("id", { count: "exact", head: true }).eq("enabled", true),
      sb.from("automation_runs").select("id", { count: "exact", head: true }).gte("created_at", since),
      sb.from("automation_runs").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "failed"),
      sb.from("automation_queue").select("id", { count: "exact", head: true }).eq("status", "queued"),
      sb.from("automation_runs").select("duration_ms").gte("created_at", since).not("duration_ms", "is", null).limit(500),
    ]);
    const dur: number[] = ((durations.data ?? []) as Array<{ duration_ms: number | null }>)
      .map((r) => r.duration_ms ?? 0).filter((n) => n > 0);
    const avg = dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : 0;
    return {
      activeWorkflows: active.count ?? 0,
      runs24h: runs24.count ?? 0,
      errors24h: errors24.count ?? 0,
      queued: queued.count ?? 0,
      avgDurationMs: avg,
    };
  });

/** API publique pour modules internes (futurs Telegram/WhatsApp/IA). */
export const emitBusinessEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    event: z.string(),
    payload: z.record(z.unknown()).optional(),
    sync: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const { automationApi } = await import("@/automation");
    const { isBusinessEvent } = await import("@/automation/core/events");
    if (!isBusinessEvent(data.event)) throw new Error(`Événement inconnu : ${data.event}`);
    return automationApi.emit(data.event, data.payload ?? {}, { sync: data.sync, actorId: context.userId });
  });