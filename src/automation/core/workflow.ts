// Types du moteur de workflows. Une définition de workflow est une suite
// d'étapes pures : (ctx) => Promise<output>. Le moteur s'occupe du
// journal, des conditions, des erreurs et de la persistance.

import type { BusinessEvent } from "./events";

export interface WorkflowContext {
  /** Payload reçu par le workflow (validé par le module appelant). */
  payload: Record<string, unknown>;
  /** Sortie cumulée des étapes précédentes (clé = step name). */
  outputs: Record<string, unknown>;
  /** Identifiant de l'exécution courante. */
  runId: string;
  /** Acteur (utilisateur admin ou "system"). */
  actorId: string | null;
}

export type WorkflowStepFn = (ctx: WorkflowContext) => Promise<unknown>;

export interface WorkflowStep {
  name: string;
  /** Si défini et retourne false, l'étape est ignorée (status = "skipped"). */
  when?: (ctx: WorkflowContext) => boolean;
  run: WorkflowStepFn;
}

export interface WorkflowDefinition {
  key: string;
  name: string;
  description?: string;
  trigger: BusinessEvent | "manual";
  steps: WorkflowStep[];
}

export type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";
export type RunStatus = "pending" | "running" | "success" | "failed" | "cancelled";