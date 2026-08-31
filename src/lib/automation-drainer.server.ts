/* eslint-disable @typescript-eslint/no-explicit-any -- queue payloads are persisted JSON. */
// Serveur-uniquement — drainage de la file `automation_queue`.
//
// Ce module extrait la logique historiquement dans
// `src/routes/api/public/automation/process-queue.ts` pour qu'elle soit
// appelable en direct depuis d'autres server functions (chemin chaud après
// paiement, bouton "Drainer maintenant" du back-office, tests E2E) sans
// aller-retour HTTP ni gestion de secret.
//
// La route publique reste le point d'entrée pour pg_cron : elle vérifie le
// `AUTOMATION_CRON_SECRET` puis délègue à `drainAutomationQueue`.

export interface DrainOptions {
  batchSize?: number;
  /** Seuil au-delà duquel un job "processing" est considéré comme bloqué. */
  reclaimAfterSeconds?: number;
}

export interface DrainResult {
  reclaimed: number;
  processed: Array<{ id: string; status: string; error?: string | null }>;
}

async function markProvisioningQueueState(
  sb: any,
  job: { workflow_key: string; payload: any },
  state: "retrying" | "failed",
  error: unknown,
) {
  if (job.workflow_key !== "payment-confirmed") return;
  const ref = String(job.payload?.orderRef ?? job.payload?.orderId ?? "");
  if (!ref) return;
  const lookup = /^[0-9a-f-]{36}$/i.test(ref)
    ? sb.from("orders").select("id, metadata").eq("id", ref)
    : sb.from("orders").select("id, metadata").eq("order_ref", ref);
  const { data: order } = await lookup.maybeSingle();
  if (!order?.id) return;
  const meta = (order.metadata ?? {}) as Record<string, any>;
  const safe = String(error ?? "workflow failed")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer ***")
    .slice(0, 500);
  const previous = (meta.iptv_provisioning ?? {}) as Record<string, any>;
  await sb
    .from("orders")
    .update({
      metadata: {
        ...meta,
        iptv_provisioning: {
          ...previous,
          state,
          error: safe,
          last_error: safe,
          correlation_id:
            previous.correlation_id ??
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random()}`,
          updated_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", order.id);
}

/**
 * Draine la file d'automation :
 *  1. Remet en `queued` les jobs "processing" abandonnés (worker crashé).
 *  2. Réclame atomiquement un lot via `automation_claim_jobs`.
 *  3. Exécute chaque workflow et met à jour le statut du job (done / retry /
 *     failed) avec backoff exponentiel.
 */
export async function drainAutomationQueue(opts: DrainOptions = {}): Promise<DrainResult> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const sb = supabaseAdmin as any;

  // 1. Rattrapage des jobs bloqués en processing.
  let reclaimed = 0;
  try {
    const { data } = await sb.rpc("automation_reclaim_stuck", {
      _older_than_seconds: opts.reclaimAfterSeconds ?? 300,
    });
    reclaimed = typeof data === "number" ? data : 0;
  } catch (e) {
    console.warn("[automation] reclaim_stuck failed", (e as any)?.message ?? e);
  }

  await import("@/automation");
  const { automationApi } = await import("@/automation");

  // 2. Claim atomique (FOR UPDATE SKIP LOCKED).
  const { data: jobs, error: claimErr } = await sb.rpc("automation_claim_jobs", {
    _batch_size: Math.max(1, Math.min(opts.batchSize ?? 10, 50)),
  });
  if (claimErr) {
    throw new Error(`claim failed: ${claimErr.message}`);
  }

  const processed: DrainResult["processed"] = [];
  const rows = (jobs ?? []) as Array<{
    id: string;
    workflow_key: string;
    payload: any;
    trigger_event: string | null;
    attempts: number;
    max_attempts: number;
  }>;

  for (const job of rows) {
    try {
      const r = await automationApi.run(job.workflow_key, job.payload ?? {}, null);
      if (r.status === "success") {
        await sb
          .from("automation_queue")
          .update({ status: "done", updated_at: new Date().toISOString() })
          .eq("id", job.id);
        processed.push({ id: job.id, status: "done" });
      } else {
        const failed = job.attempts >= job.max_attempts;
        const backoffMs = Math.min(
          15 * 60_000,
          30_000 * Math.pow(2, Math.max(0, job.attempts - 1)),
        );
        const nextAt = new Date(Date.now() + backoffMs).toISOString();
        await sb
          .from("automation_queue")
          .update({
            status: failed ? "failed" : "queued",
            last_error: r.error ?? "workflow failed",
            scheduled_at: failed ? undefined : nextAt,
            locked_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await markProvisioningQueueState(sb, job, failed ? "failed" : "retrying", r.error);
        processed.push({ id: job.id, status: failed ? "failed" : "retry", error: r.error });
      }
    } catch (e: any) {
      const failed = job.attempts >= job.max_attempts;
      const backoffMs = Math.min(15 * 60_000, 30_000 * Math.pow(2, Math.max(0, job.attempts - 1)));
      const nextAt = new Date(Date.now() + backoffMs).toISOString();
      await sb
        .from("automation_queue")
        .update({
          status: failed ? "failed" : "queued",
          last_error: String(e?.message ?? e),
          scheduled_at: failed ? undefined : nextAt,
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await markProvisioningQueueState(sb, job, failed ? "failed" : "retrying", e?.message ?? e);
      processed.push({
        id: job.id,
        status: failed ? "failed" : "retry",
        error: String(e?.message ?? e),
      });
    }
  }

  return { reclaimed, processed };
}

/**
 * Version fire-and-forget pour le "chemin chaud" après paiement : lance le
 * drainage sans bloquer l'appelant et sans jamais rejeter. Le worker
 * Cloudflare tient les promesses en vie tant que la requête parente n'est
 * pas fermée, mais si le drain s'exécute au-delà, le prochain tick cron
 * rattrapera de toute façon les jobs restants.
 */
export function kickDrainInBackground(opts: DrainOptions = {}): void {
  drainAutomationQueue(opts).catch((e) => {
    console.warn("[automation] background drain failed", (e as any)?.message ?? e);
  });
}
