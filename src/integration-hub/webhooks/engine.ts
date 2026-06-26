// Common engine for INBOUND webhooks: signature verification, history,
// retry. Existing routes (SebPay) keep their hand-rolled verification —
// this engine is the surface new connectors plug into.

import { integrationError, type IntegrationError } from "../core/errors";
import { logger } from "../core/logger";
import { metrics } from "../core/monitoring";
import { err, ok, type Result } from "../core/result";
import { verifyHmac } from "./signatures";

export interface WebhookHandlerContext {
  connectorId: string;
  rawBody: string;
  parsed: unknown;
  headers: Headers;
}

export interface WebhookRegistration {
  connectorId: string;
  /** Header carrying the HMAC signature, e.g. "X-Stripe-Signature". */
  signatureHeader: string;
  /** Lookup function so we never cache the secret in memory long-term. */
  getSecret: () => string | undefined;
  /** Process the verified payload; throw to trigger retry. */
  handler: (ctx: WebhookHandlerContext) => Promise<void>;
  /** Default retry budget. Defaults to 3. */
  maxAttempts?: number;
}

export interface WebhookHistoryEntry {
  id: string;
  connectorId: string;
  receivedAt: string;
  status: "verified" | "signature_invalid" | "processed" | "failed";
  attempts: number;
  errorKind?: string;
}

class WebhookEngine {
  private readonly registrations = new Map<string, WebhookRegistration>();
  private readonly history: WebhookHistoryEntry[] = [];
  private readonly historyCap = 200;

  register(reg: WebhookRegistration): void {
    this.registrations.set(reg.connectorId, reg);
  }

  isRegistered(connectorId: string): boolean {
    return this.registrations.has(connectorId);
  }

  recentHistory(): WebhookHistoryEntry[] {
    return [...this.history];
  }

  async deliver(connectorId: string, rawBody: string, headers: Headers): Promise<Result<void, IntegrationError>> {
    const reg = this.registrations.get(connectorId);
    if (!reg) return err(integrationError("not_found", `No webhook registered for "${connectorId}"`));

    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const baseEntry: WebhookHistoryEntry = {
      id, connectorId, receivedAt: new Date().toISOString(),
      status: "verified", attempts: 0,
    };

    const secret = reg.getSecret();
    if (!secret) {
      this.push({ ...baseEntry, status: "failed", errorKind: "configuration" });
      return err(integrationError("configuration", "Webhook secret missing", { connectorId }));
    }

    const signature = headers.get(reg.signatureHeader) ?? headers.get(reg.signatureHeader.toLowerCase()) ?? "";
    if (!signature || !verifyHmac(secret, rawBody, signature)) {
      this.push({ ...baseEntry, status: "signature_invalid", errorKind: "signature" });
      logger.warn("webhook signature invalid", { connectorId });
      return err(integrationError("signature", "Invalid webhook signature", { connectorId }));
    }

    let parsed: unknown = null;
    try { parsed = rawBody ? JSON.parse(rawBody) : null; } catch { /* keep null */ }

    const maxAttempts = Math.max(1, reg.maxAttempts ?? 3);
    let backoff = 200;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const start = Date.now();
      try {
        await reg.handler({ connectorId, rawBody, parsed, headers });
        this.push({ ...baseEntry, status: "processed", attempts: attempt });
        metrics.record({ connectorId, operation: "webhook.deliver", status: "success", durationMs: Date.now() - start, meta: { attempt } });
        return ok(undefined);
      } catch (e: any) {
        if (attempt === maxAttempts) {
          this.push({ ...baseEntry, status: "failed", attempts: attempt, errorKind: "provider" });
          metrics.record({ connectorId, operation: "webhook.deliver", status: "failure", durationMs: Date.now() - start, errorKind: "provider" });
          logger.error("webhook handler failed", { connectorId, attempts: attempt });
          return err(integrationError("provider", String(e?.message ?? e), { connectorId, retryable: false }));
        }
        await new Promise((r) => setTimeout(r, backoff));
        backoff *= 2;
      }
    }
    return err(integrationError("unknown", "Unreachable", { connectorId }));
  }

  private push(entry: WebhookHistoryEntry) {
    this.history.push(entry);
    if (this.history.length > this.historyCap) this.history.shift();
  }
}

export const webhookEngine = new WebhookEngine();