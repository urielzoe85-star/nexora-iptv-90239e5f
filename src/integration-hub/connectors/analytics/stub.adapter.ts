import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { AnalyticsConnector } from "./types";

export const analyticsConnector: AnalyticsConnector = {
  id: "analytics.default", type: "analytics", label: "Analytics", status: "stub",
  isReady() { return false; },
  async track() { return err(integrationError("not_implemented", "Analytics connector is not implemented yet", { connectorId: "analytics.default" })); },
};