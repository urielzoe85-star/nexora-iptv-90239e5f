import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface EmailSendInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}
export interface EmailSendResult {
  providerMessageId?: string;
  accepted: string[];
}

export interface EmailConnector extends Connector {
  readonly type: "email";
  send(input: EmailSendInput): Promise<Result<EmailSendResult, IntegrationError>>;
}