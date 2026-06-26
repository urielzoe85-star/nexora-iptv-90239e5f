import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { StorageConnector } from "./types";

export const storageConnector: StorageConnector = {
  id: "storage.default", type: "storage", label: "Object Storage", status: "stub",
  isReady() { return false; },
  async put()       { return err(integrationError("not_implemented", "Storage connector is not implemented yet", { connectorId: "storage.default" })); },
  async signedUrl() { return err(integrationError("not_implemented", "Storage connector is not implemented yet", { connectorId: "storage.default" })); },
};