import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export type MessagingChannel = "whatsapp" | "telegram" | "sms" | "in_app";

export interface MessageInput {
  to: string;
  body: string;
  subject?: string;
  metadata?: Record<string, unknown>;
}
export interface MessageResult {
  providerMessageId?: string;
  status: "queued" | "sent" | "delivered" | "failed";
}

export interface MessagingConnector extends Connector {
  readonly type: "messaging";
  readonly channel: MessagingChannel;
  send(input: MessageInput): Promise<Result<MessageResult, IntegrationError>>;
}