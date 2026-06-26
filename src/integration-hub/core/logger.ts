// Structured logger used by the gateway, webhook engine and connectors.
// Wraps console so we can swap to a real sink (Sentry, Datadog…) later
// without touching call sites. Never log secrets — call `redact` first.

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  connectorId?: string;
  requestId?: string;
  durationMs?: number;
  status?: number;
  [k: string]: unknown;
}

export interface IntegrationLogger {
  log(level: LogLevel, message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

class ConsoleLogger implements IntegrationLogger {
  log(level: LogLevel, message: string, fields: LogFields = {}): void {
    const prefix = `[integration-hub:${level}]`;
    const payload = Object.keys(fields).length ? fields : "";
    // eslint-disable-next-line no-console
    (console[level === "debug" ? "log" : level] as any)(prefix, message, payload);
  }
  debug(m: string, f?: LogFields) { this.log("debug", m, f); }
  info(m: string, f?: LogFields)  { this.log("info",  m, f); }
  warn(m: string, f?: LogFields)  { this.log("warn",  m, f); }
  error(m: string, f?: LogFields) { this.log("error", m, f); }
}

export const logger: IntegrationLogger = new ConsoleLogger();

/** Redact a value to safe metadata (length + prefix only). */
export function redact(value: string | undefined | null): string {
  if (!value) return "(empty)";
  return `len=${value.length} prefix=${value.slice(0, 4)}`;
}