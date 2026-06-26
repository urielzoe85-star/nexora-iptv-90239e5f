// Central registry of every connector available in this NEXORA instance.
// Business modules ask the registry for a connector by type/id; they
// never import a concrete adapter directly. Adding a provider = register
// it once, every module sees it.

import type { Connector, ConnectorType } from "./connector";

class ConnectorRegistry {
  private readonly byId = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.byId.has(connector.id)) {
      // Overwriting is a programmer error — fail loudly instead of leaking
      // a previous registration into runtime.
      throw new Error(`Connector "${connector.id}" is already registered.`);
    }
    this.byId.set(connector.id, connector);
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