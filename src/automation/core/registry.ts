import type { WorkflowDefinition } from "./workflow";

class WorkflowRegistry {
  private readonly byKey = new Map<string, WorkflowDefinition>();

  register(def: WorkflowDefinition): void {
    if (this.byKey.has(def.key)) {
      throw new Error(`Workflow "${def.key}" est déjà enregistré.`);
    }
    this.byKey.set(def.key, def);
  }

  get(key: string): WorkflowDefinition | undefined {
    return this.byKey.get(key);
  }

  require(key: string): WorkflowDefinition {
    const d = this.get(key);
    if (!d) throw new Error(`Workflow "${key}" introuvable.`);
    return d;
  }

  list(): WorkflowDefinition[] {
    return [...this.byKey.values()];
  }

  /** Workflows déclenchés par un événement métier donné. */
  listForEvent(event: string): WorkflowDefinition[] {
    return this.list().filter((w) => w.trigger === event);
  }
}

export const workflowRegistry = new WorkflowRegistry();