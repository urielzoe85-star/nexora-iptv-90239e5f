// Unified error hierarchy. Every connector reports failures using one of
// these kinds so the gateway / monitoring layers can react uniformly.

export type IntegrationErrorKind =
  | "not_implemented"     // adapter exists but provider is not wired yet
  | "configuration"       // missing secret / wrong env
  | "unauthorized"        // 401 from provider
  | "forbidden"           // 403 from provider
  | "not_found"           // 404 from provider
  | "rate_limited"        // 429 from provider
  | "validation"          // bad input
  | "signature"           // webhook signature mismatch
  | "timeout"             // call exceeded budget
  | "network"             // fetch failed / connection error
  | "provider"            // 5xx or provider-side failure
  | "unknown";

export interface IntegrationError {
  kind: IntegrationErrorKind;
  message: string;
  /** Provider/HTTP status code when applicable. */
  status?: number;
  /** Connector id that produced the error. */
  connectorId?: string;
  /** Safe metadata (NEVER include secrets, tokens, full PII). */
  meta?: Record<string, unknown>;
  /** Whether the gateway should retry. */
  retryable?: boolean;
}

export function integrationError(
  kind: IntegrationErrorKind,
  message: string,
  extra: Partial<IntegrationError> = {},
): IntegrationError {
  return { kind, message, ...extra };
}

export function isRetryable(e: IntegrationError): boolean {
  if (e.retryable !== undefined) return e.retryable;
  return e.kind === "rate_limited" || e.kind === "timeout" || e.kind === "network" || e.kind === "provider";
}