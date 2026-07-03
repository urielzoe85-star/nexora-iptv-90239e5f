// Server functions du moteur d'automatisation. Admin uniquement.

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// Le middleware `requireAdmin` a déjà vérifié le rôle ; ce helper ne fait
// que renvoyer le client service_role prêt à l'emploi.
async function admin(_userId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
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
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ key: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("automation_workflows").update({ enabled: data.enabled }).eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runWorkflowManually = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ key: z.string(), payload: z.record(z.unknown()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const { automationApi } = await import("@/automation");
    const r = await automationApi.run(data.key, data.payload ?? {}, context.userId);
    return { runId: r.runId, status: r.status, error: r.error ?? null };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
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
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: run, error } = await sb.from("automation_runs").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: steps } = await sb.from("automation_steps").select("*").eq("run_id", data.id).order("step_index");
    return { run, steps: steps ?? [] };
  });

export const replayRunFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const { automationApi } = await import("@/automation");
    const r = await automationApi.replay(data.id);
    return { runId: r.runId, status: r.status, error: r.error ?? null };
  });

export const getAutomationKpis = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
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
  .middleware([requireAdmin])
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

// ─────────────────────────────────────────────────────────────────────
// Santé de la file automation + contrôles manuels (admin) + kick public
// pour /track. Sprint 1.7 — robustesse de l'auto-attribution IPTV.
// ─────────────────────────────────────────────────────────────────────

/**
 * Public — appelé par la page /track quand un paiement stagne trop
 * longtemps. Rate-limité par order_ref pour éviter le spam. Ne renvoie
 * qu'un ok/booléen : aucune donnée sensible n'est exposée.
 */
export const kickAutomationQueue = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ref: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { allow } = await import("@/lib/rate-limit.server");
    const rl = allow(`kick:${data.ref}`, { limit: 1, windowMs: 10_000 });
    if (!rl.ok) return { ok: false as const, throttled: true as const };
    const { kickDrainInBackground } = await import("@/lib/automation-drainer.server");
    kickDrainInBackground({ batchSize: 5 });
    return { ok: true as const };
  });

/** Admin — statistiques temps-réel de la file d'automation. */
export const getAutomationHealth = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const [queuedRes, procRes, failedRes, oldest, stuckProc] = await Promise.all([
      sb.from("automation_queue").select("id", { count: "exact", head: true }).eq("status", "queued"),
      sb.from("automation_queue").select("id", { count: "exact", head: true }).eq("status", "processing"),
      sb.from("automation_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
      sb.from("automation_queue").select("created_at").eq("status", "queued").order("created_at").limit(1).maybeSingle(),
      sb.from("automation_queue").select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lt("locked_at", new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);
    const oldestAgeSec = oldest.data?.created_at
      ? Math.round((Date.now() - new Date(oldest.data.created_at).getTime()) / 1000)
      : 0;
    return {
      queued: queuedRes.count ?? 0,
      processing: procRes.count ?? 0,
      failed: failedRes.count ?? 0,
      stuckProcessing: stuckProc.count ?? 0,
      oldestQueuedAgeSec: oldestAgeSec,
    };
  });

/** Admin — force un drainage immédiat. */
export const adminDrainQueueNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { drainAutomationQueue } = await import("@/lib/automation-drainer.server");
    return drainAutomationQueue({ batchSize: 25 });
  });

/** Admin — remet les jobs "failed" en "queued" pour retenter (attempts remis à 0). */
export const adminRetryFailedJobs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ maxAgeHours: z.number().int().min(1).max(720).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const cutoff = new Date(Date.now() - (data.maxAgeHours ?? 24) * 3600_000).toISOString();
    const { data: updated, error } = await sb
      .from("automation_queue")
      .update({
        status: "queued",
        attempts: 0,
        locked_at: null,
        scheduled_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "failed")
      .gte("updated_at", cutoff)
      .select("id");
    if (error) throw new Error(error.message);
    // Rattrape immédiatement.
    const { kickDrainInBackground } = await import("@/lib/automation-drainer.server");
    kickDrainInBackground({ batchSize: 25 });
    return { requeued: (updated ?? []).length };
  });

/**
 * Admin — force l'attribution + livraison IPTV d'une commande précise, sans
 * passer par la file. Utile quand :
 *  - le workflow a échoué et l'admin veut débloquer une commande urgente,
 *  - un compte a été attribué manuellement et l'admin veut relancer l'envoi.
 */
export const adminForceAttributeOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ orderRef: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await import("@/automation");
    const { automationApi } = await import("@/automation");
    const r = await automationApi.run(
      "payment-confirmed",
      { orderRef: data.orderRef, orderId: data.orderRef, forced: true },
      context.userId,
    );
    return { runId: r.runId, status: r.status, error: r.error ?? null };
  });