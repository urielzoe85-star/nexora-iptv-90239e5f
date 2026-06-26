import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface AnalyticsEvent {
  name: string;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}
export interface AnalyticsConnector extends Connector {
  readonly type: "analytics";
  track(event: AnalyticsEvent): Promise<Result<void, IntegrationError>>;
}