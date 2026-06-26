import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { IPTVConnector } from "./types";

function stub(id: string, label: string): IPTVConnector {
  const fail = () => err(integrationError("not_implemented", `${label} is not implemented yet`, { connectorId: id }));
  return {
    id, type: "iptv", label, status: "stub",
    isReady() { return false; },
    async createUser()     { return fail(); },
    async suspendUser()    { return fail(); },
    async reactivateUser() { return fail(); },
    async extend()         { return fail(); },
    async getUser()        { return fail(); },
  };
}

export const megaottConnector     = stub("iptv.megaott",     "MEGAOTT");
export const xtreamUiConnector    = stub("iptv.xtream_ui",   "Xtream UI");
export const xtreamCodesConnector = stub("iptv.xtream_codes","Xtream Codes");