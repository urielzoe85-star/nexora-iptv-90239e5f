import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { AIConnector } from "./types";

export const lovableAiConnector: AIConnector = {
  id: "ai.lovable_gateway", type: "ai", label: "Lovable AI Gateway", status: "stub",
  isReady() { return false; },
  async complete() {
    return err(integrationError("not_implemented", "AI connector is not wired through the hub yet", { connectorId: "ai.lovable_gateway" }));
  },
};