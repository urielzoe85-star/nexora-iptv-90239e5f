import { apiGateway } from "../../gateway/api-gateway";
import { hmacHex } from "../../webhooks/signatures";
import { err, ok } from "../../core/result";
import { integrationError } from "../../core/errors";
import type { WebhookConnector } from "./types";

export const outboundWebhookConnector: WebhookConnector = {
  id: "webhook.outbound",
  type: "webhook",
  label: "Outbound Webhooks",
  status: "enabled",
  capabilities: ["dispatch", "signed"],
  isReady() { return true; },

  async dispatch(input) {
    const body = JSON.stringify({ event: input.event, payload: input.payload, sentAt: new Date().toISOString() });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (input.signingSecret) headers["X-Nexora-Signature"] = await hmacHex(input.signingSecret, body);
    const r = await apiGateway.request({
      connectorId: this.id, url: input.url, method: "POST",
      headers, body, apiVersion: "v1", maxAttempts: 4,
    });
    if (!r.ok) return err(r.error);
    if (r.value.status >= 400) {
      return err(integrationError("provider", `Webhook target returned ${r.value.status}`, { connectorId: this.id, status: r.value.status }));
    }
    return ok({ status: r.value.status });
  },
};