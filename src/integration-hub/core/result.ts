// Result type used across the Integration Hub. Connectors return
// Result<T> instead of throwing so callers (business modules) can react
// without try/catch noise. Throwing is reserved for programming errors.

import type { IntegrationError } from "./errors";

export type Result<T, E = IntegrationError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E extends IntegrationError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export function unwrapOr<T>(r: Result<T>, fallback: T): T {
  return r.ok ? r.value : fallback;
}