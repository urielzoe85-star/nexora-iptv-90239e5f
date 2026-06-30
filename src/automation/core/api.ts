// API interne du moteur d'automatisation. Tous les modules (Telegram,
// WhatsApp, mobile, IA, server fns) doivent passer par cette API pour
// déclencher un workflow — jamais d'appel direct à l'engine.

import { runWorkflow, enqueueWorkflow, replayRun } from "./engine";
import { workflowRegistry } from "./registry";
import type { BusinessEvent } from "./events";
import type { RunResult } from "./engine";

export interface EmitOptions {
  /** Si true, exécute immédiatement (par défaut : enqueue async). */
  sync?: boolean;
  actorId?: string | null;
  /** Clé d'idempotence — empêche le double-enqueue du même événement métier. */
  idempotencyKey?: string | null;
}

export const automationApi = {
  /** Émet un événement métier. Tous les workflows liés sont enqueue (ou exécutés). */
  async emit(event: BusinessEvent, payload: Record<string, unknown> = {}, opts: EmitOptions = {}): Promise<string[]> {
    const workflows = workflowRegistry.listForEvent(event);
    const out: string[] = [];
    for (const w of workflows) {
      if (opts.sync) {
        const r = await runWorkflow(w.key, { payload, triggerEvent: event, actorId: opts.actorId ?? null });
        out.push(r.runId);
      } else {
        // Per-workflow idempotency key: caller-supplied scope + workflow key.
        const idk = opts.idempotencyKey ? `${w.key}:${opts.idempotencyKey}` : null;
        out.push(await enqueueWorkflow(w.key, payload, event, { idempotencyKey: idk }));
      }
    }
    return out;
  },

  /** Lance un workflow manuellement (utilisé par l'UI "Exécuter"). */
  run(key: string, payload: Record<string, unknown> = {}, actorId?: string | null): Promise<RunResult> {
    return runWorkflow(key, { payload, triggerEvent: "manual", actorId: actorId ?? null });
  },

  /** Relance un run échoué. */
  replay(runId: string): Promise<RunResult> {
    return replayRun(runId);
  },

  /** Liste les workflows enregistrés (définition code). */
  list() {
    return workflowRegistry.list();
  },
};