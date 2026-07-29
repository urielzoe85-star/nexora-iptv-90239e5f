// Exécuteur de workflows. Persiste run + steps dans Postgres via le client
// service-role (chargé dynamiquement — ce fichier est appelé uniquement
// depuis des server functions admin ou la route cron sécurisée).

import type { WorkflowDefinition, WorkflowContext, RunStatus, StepStatus } from "./workflow";
import { workflowRegistry } from "./registry";
import { errorMessage } from "@/lib/error-message";

export interface RunOptions {
  payload?: Record<string, unknown>;
  triggerEvent?: string | null;
  actorId?: string | null;
}

export interface RunResult {
  runId: string;
  status: RunStatus;
  error?: string;
  outputs: Record<string, unknown>;
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

async function loadWorkflowRow(sb: any, key: string) {
  const { data } = await sb.from("automation_workflows").select("id, enabled").eq("key", key).maybeSingle();
  return data as { id: string; enabled: boolean } | null;
}

export async function runWorkflow(key: string, opts: RunOptions = {}): Promise<RunResult> {
  const def: WorkflowDefinition = workflowRegistry.require(key);
  const sb = await getAdmin();
  const row = await loadWorkflowRow(sb, key);
  if (row && !row.enabled) {
    return { runId: "", status: "cancelled", error: "Workflow désactivé", outputs: {} };
  }

  const startedAt = new Date();
  const { data: inserted, error: insertErr } = await sb
    .from("automation_runs")
    .insert({
      workflow_id: row?.id ?? null,
      workflow_key: key,
      trigger_event: opts.triggerEvent ?? null,
      payload: opts.payload ?? {},
      status: "running",
      started_at: startedAt.toISOString(),
      actor_id: opts.actorId ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    throw new Error(`Impossible de créer le run: ${insertErr?.message ?? "unknown"}`);
  }
  const runId: string = inserted.id;

  const ctx: WorkflowContext = {
    payload: opts.payload ?? {},
    outputs: {},
    runId,
    actorId: opts.actorId ?? null,
  };

  let runStatus: RunStatus = "success";
  let runError: string | undefined;

  for (let i = 0; i < def.steps.length; i++) {
    const step = def.steps[i];
    const skip = step.when ? !step.when(ctx) : false;
    const stepStartedAt = new Date();

    const { data: stepRow } = await sb.from("automation_steps").insert({
      run_id: runId,
      step_index: i,
      name: step.name,
      status: (skip ? "skipped" : "running") as StepStatus,
      started_at: skip ? null : stepStartedAt.toISOString(),
      input: { ...ctx.outputs },
    }).select("id").single();

    if (skip) continue;

    try {
      const out = await step.run(ctx);
      ctx.outputs[step.name] = out;
      const finishedAt = new Date();
      if (stepRow?.id) {
        await sb.from("automation_steps").update({
          status: "success" as StepStatus,
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - stepStartedAt.getTime(),
          output: serialize(out),
        }).eq("id", stepRow.id);
      }
    } catch (e: unknown) {
      const finishedAt = new Date();
      const msg = String(errorMessage(e) ?? e);
      if (stepRow?.id) {
        await sb.from("automation_steps").update({
          status: "failed" as StepStatus,
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - stepStartedAt.getTime(),
          error: msg,
        }).eq("id", stepRow.id);
      }
      runStatus = "failed";
      runError = `Étape "${step.name}" : ${msg}`;
      break;
    }
  }

  const finishedAt = new Date();
  await sb.from("automation_runs").update({
    status: runStatus,
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    error: runError ?? null,
  }).eq("id", runId);

  return { runId, status: runStatus, error: runError, outputs: ctx.outputs };
}

function serialize(v: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(v ?? null));
  } catch {
    return null;
  }
}

/** Enqueue un workflow pour traitement asynchrone. */
export async function enqueueWorkflow(
  key: string,
  payload: Record<string, unknown> = {},
  triggerEvent?: string,
  opts: { idempotencyKey?: string | null; scheduledAt?: string | null } = {},
) {
  const sb = await getAdmin();
  const row: Record<string, unknown> = {
    workflow_key: key,
    payload,
    trigger_event: triggerEvent ?? null,
    status: "queued",
  };
  if (opts.idempotencyKey) row.idempotency_key = opts.idempotencyKey;
  if (opts.scheduledAt) row.scheduled_at = opts.scheduledAt;

  const { data, error } = await sb
    .from("automation_queue")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    // 23505 = unique_violation on idempotency_key — silently skip duplicates.
    if (opts.idempotencyKey && String((error as any).code) === "23505") {
      const { data: existing } = await sb
        .from("automation_queue")
        .select("id")
        .eq("idempotency_key", opts.idempotencyKey)
        .in("status", ["queued", "processing", "done"])
        .maybeSingle();
      return (existing?.id as string) ?? "";
    }
    throw new Error(error.message);
  }
  return data.id as string;
}

/** Relance un run échoué. */
export async function replayRun(runId: string): Promise<RunResult> {
  const sb = await getAdmin();
  const { data, error } = await sb.from("automation_runs")
    .select("workflow_key, payload, trigger_event, actor_id")
    .eq("id", runId).single();
  if (error || !data) throw new Error(errorMessage(error) ?? "Run introuvable");
  return runWorkflow(data.workflow_key, {
    payload: data.payload ?? {},
    triggerEvent: data.trigger_event,
    actorId: data.actor_id,
  });
}