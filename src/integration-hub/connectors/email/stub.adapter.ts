import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { EmailConnector } from "./types";

export const transactionalEmailConnector: EmailConnector = {
  id: "email.transactional", type: "email", label: "Transactional Email", status: "stub",
  isReady() { return false; },
  async send() {
    return err(integrationError("not_implemented", "Email connector is not implemented yet", { connectorId: "email.transactional" }));
  },
};