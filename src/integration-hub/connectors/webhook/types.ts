import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

// Outbound webhook connector: send events to a partner-defined URL.
export interface WebhookDispatchInput {
  url: string;
  event: string;
  payload: unknown;
  /** Optional signing secret; when present, body is signed with HMAC-SHA256. */
  signingSecret?: string;
}
export interface WebhookDispatchResult { status: number }

export interface WebhookConnector extends Connector {
  readonly type: "webhook";
  dispatch(input: WebhookDispatchInput): Promise<Result<WebhookDispatchResult, IntegrationError>>;
}