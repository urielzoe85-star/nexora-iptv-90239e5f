// Single outbound HTTP entry point. Connectors call apiGateway.request()
// instead of fetch() directly so we get: auth header injection, timeout,
// retry with backoff, request id, structured logging, metrics, and a
// best-effort token-bucket rate limit per (connectorId + host).

import { integrationError, isRetryable, type IntegrationError } from "../core/errors";
import { logger } from "../core/logger";
import { metrics } from "../core/monitoring";
import { err, ok, type Result } from "../core/result";

export interface GatewayRequest {
  connectorId: string;
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  /** Hard timeout for one attempt. Default 15s. */
  timeoutMs?: number;
  /** Total attempts including the first one. Default 3. */
  maxAttempts?: number;
  /** Initial backoff in ms; doubles per attempt. Default 250. */
  backoffMs?: number;
  /** Logical API version (e.g. "v1"). Sent as X-Nexora-API-Version. */
  apiVersion?: string;
  /** Per-minute soft cap. Default 120/min/(connector+host). */
  ratePerMinute?: number;
}

export interface GatewayResponse {
  status: number;
  headers: Headers;
  raw: string;
  json: unknown;
  durationMs: number;
  attempts: number;
}

// ─── Token-bucket rate limit (in-memory, best effort) ─────────────────
const buckets = new Map<string, { tokens: number; updatedAt: number; capacity: number }>();

function rateLimitKey(connectorId: string, url: string) {
  try { return `${connectorId}:${new URL(url).host}`; } catch { return connectorId; }
}
function consumeToken(key: string, perMinute: number): boolean {
  const now = Date.now();
  const refillRatePerMs = perMinute / 60_000;
  const b = buckets.get(key) ?? { tokens: perMinute, updatedAt: now, capacity: perMinute };
  const elapsed = now - b.updatedAt;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * refillRatePerMs);
  b.updatedAt = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

async function attempt(req: GatewayRequest): Promise<{ res?: Response; raw?: string; error?: IntegrationError; durationMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 15_000);
  const start = Date.now();
  try {
    const res = await fetch(req.url, {
      method: req.method ?? "GET",
      headers: req.headers,
      body: req.body !== undefined ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined,
      signal: controller.signal,
    });
    const raw = await res.text();
    return { res, raw, durationMs: Date.now() - start };
  } catch (e: any) {
    const isAbort = e?.name === "AbortError";
    return {
      error: integrationError(isAbort ? "timeout" : "network", isAbort ? "Request timed out" : String(e?.message ?? e), {
        connectorId: req.connectorId,
        retryable: true,
      }),
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const apiGateway = {
  async request(req: GatewayRequest): Promise<Result<GatewayResponse, IntegrationError>> {
    const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const ratePerMinute = req.ratePerMinute ?? 120;
    const rlKey = rateLimitKey(req.connectorId, req.url);
    if (!consumeToken(rlKey, ratePerMinute)) {
      const e = integrationError("rate_limited", "Local rate limit exceeded", {
        connectorId: req.connectorId,
        meta: { rlKey, ratePerMinute },
        retryable: false,
      });
      metrics.record({ connectorId: req.connectorId, operation: "http", status: "failure", durationMs: 0, errorKind: e.kind });
      logger.warn("rate-limited locally", { connectorId: req.connectorId, requestId, rlKey });
      return err(e);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Nexora-Request-Id": requestId,
      ...(req.apiVersion ? { "X-Nexora-API-Version": req.apiVersion } : {}),
      ...(req.body !== undefined && !req.headers?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
      ...(req.headers ?? {}),
    };

    const maxAttempts = Math.max(1, req.maxAttempts ?? 3);
    let backoff = req.backoffMs ?? 250;
    let lastErr: IntegrationError | undefined;
    let totalDuration = 0;

    for (let i = 1; i <= maxAttempts; i++) {
      logger.debug("→ outbound", { connectorId: req.connectorId, requestId, attempt: i, url: req.url, method: req.method ?? "GET" });
      const { res, raw, error, durationMs } = await attempt({ ...req, headers });
      totalDuration += durationMs;

      if (error) {
        lastErr = error;
        if (!isRetryable(error) || i === maxAttempts) {
          metrics.record({ connectorId: req.connectorId, operation: "http", status: "failure", durationMs: totalDuration, errorKind: error.kind });
          logger.error("outbound failed", { connectorId: req.connectorId, requestId, kind: error.kind, attempts: i });
          return err(error);
        }
      } else if (res) {
        const json = (() => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } })();
        if (res.status >= 200 && res.status < 300) {
          metrics.record({ connectorId: req.connectorId, operation: "http", status: "success", durationMs: totalDuration });
          logger.info("← outbound ok", { connectorId: req.connectorId, requestId, status: res.status, durationMs: totalDuration, attempts: i });
          return ok({ status: res.status, headers: res.headers, raw: raw ?? "", json, durationMs: totalDuration, attempts: i });
        }
        const kind = res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : res.status === 404 ? "not_found" : res.status === 429 ? "rate_limited" : res.status >= 500 ? "provider" : "validation";
        lastErr = integrationError(kind, `Upstream returned ${res.status}`, {
          status: res.status,
          connectorId: req.connectorId,
          retryable: kind === "rate_limited" || kind === "provider",
        });
        if (!isRetryable(lastErr) || i === maxAttempts) {
          metrics.record({ connectorId: req.connectorId, operation: "http", status: "failure", durationMs: totalDuration, errorKind: lastErr.kind });
          logger.warn("outbound non-2xx", { connectorId: req.connectorId, requestId, status: res.status, attempts: i });
          return err(lastErr);
        }
      }

      // Backoff before next attempt.
      await new Promise((r) => setTimeout(r, backoff));
      backoff *= 2;
    }

    return err(lastErr ?? integrationError("unknown", "Unknown gateway failure", { connectorId: req.connectorId }));
  },
} as const;