// Centralised access to server-side secrets. The Front Office never
// imports this module — it lives in regular .ts files but is only ever
// called from server function handlers / server route handlers, where
// process.env is populated. A missing secret returns a typed error so
// the API gateway can mark the connector as misconfigured instead of
// crashing the request.

import { integrationError, type IntegrationError } from "./errors";
import { err, ok, type Result } from "./result";

function readEnv(name: string): string {
  const raw = (process.env as Record<string, string | undefined>)[name] ?? "";
  // Trim & strip wrapping quotes the way SebPay's loader does, so every
  // connector benefits from the same hardening.
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

export const secretsManager = {
  get(name: string): string | undefined {
    const v = readEnv(name);
    return v.length > 0 ? v : undefined;
  },
  has(name: string): boolean {
    return readEnv(name).length > 0;
  },
  require(name: string): Result<string, IntegrationError> {
    const v = readEnv(name);
    if (!v) return err(integrationError("configuration", `Missing secret: ${name}`));
    return ok(v);
  },
  requireMany(names: readonly string[]): Result<Record<string, string>, IntegrationError> {
    const out: Record<string, string> = {};
    for (const n of names) {
      const v = readEnv(n);
      if (!v) return err(integrationError("configuration", `Missing secret: ${n}`, { meta: { name: n } }));
      out[n] = v;
    }
    return ok(out);
  },
} as const;