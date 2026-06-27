// Central registry of every connector available in this NEXORA instance.
// Business modules ask the registry for a connector by type/id; they
// never import a concrete adapter directly. Adding a provider = register
// it once, every module sees it.

import type { Connector, ConnectorType } from "./connector";

class ConnectorRegistry {
  private readonly byId = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.byId.has(connector.id)) {
      // Idempotent: re-registering with the same id replaces the previous
      // entry. This is important in server runtimes where module instances
      // can be re-evaluated (HMR, worker isolates, server-fn bundling).
    }
    this.byId.set(connector.id, connector);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get<T extends Connector = Connector>(id: string): T | undefined {
    return this.byId.get(id) as T | undefined;
  }

  require<T extends Connector = Connector>(id: string): T {
    const c = this.get<T>(id);
    if (!c) throw new Error(`Connector "${id}" is not registered.`);
    return c;
  }

  listByType<T extends Connector = Connector>(type: ConnectorType): T[] {
    return [...this.byId.values()].filter((c) => c.type === type) as T[];
  }

  list(): Connector[] {
    return [...this.byId.values()];
  }
}

export const connectorRegistry = new ConnectorRegistry();