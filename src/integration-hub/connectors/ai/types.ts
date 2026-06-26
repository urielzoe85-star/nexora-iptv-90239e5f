import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface AICompletionInput {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}
export interface AICompletionResult {
  text: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface AIConnector extends Connector {
  readonly type: "ai";
  complete(input: AICompletionInput): Promise<Result<AICompletionResult, IntegrationError>>;
}