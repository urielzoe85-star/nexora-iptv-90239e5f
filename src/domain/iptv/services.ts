// Phase 1.4 — IPTV domain services.
// Thin orchestration layer above the Integration Hub registry and the
// server functions. UI/business modules consume these services; they
// never import a concrete IPTV adapter directly.

import { connectorRegistry } from "@/integration-hub";
import type { IPTVConnector } from "@/integration-hub/connectors/iptv/types";
import {
  listProviders, upsertProvider, deleteProvider, setDefaultProvider,
  toggleProviderStatus, checkProviderHealth,
  listAccounts, createAccount, updateAccount, deleteAccount,
  transitionAccount, importAccountsCsv, exportAccountsCsv,
  listIptvLogs, iptvDashboard,
} from "@/lib/iptv.functions";

// ProviderService — CRUD + activation logic (delegates to server fns)
export const ProviderService = {
  list:          () => listProviders(),
  upsert:        (data: any) => upsertProvider({ data }),
  remove:        (id: string) => deleteProvider({ data: { id } }),
  setDefault:    (id: string) => setDefaultProvider({ data: { id } }),
  setStatus:     (id: string, status: "active" | "inactive" | "error") =>
                   toggleProviderStatus({ data: { id, status } }),
  /** Returns every IPTV connector currently registered in the Integration Hub. */
  registered:    () => connectorRegistry.listByType<IPTVConnector>("iptv"),
};

// IPTVAccountService — pool of provisioned credentials
export const IPTVAccountService = {
  list:      (data?: any) => listAccounts({ data: data ?? {} }),
  create:    (data: any) => createAccount({ data }),
  update:    (data: any) => updateAccount({ data }),
  remove:    (id: string) => deleteAccount({ data: { id } }),
  transition:(data: any) => transitionAccount({ data }),
  importCsv: (data: any) => importAccountsCsv({ data }),
  exportCsv: (data?: any) => exportAccountsCsv({ data: data ?? {} }),
};

// TrialService — trial pool reservation / distribution (auto-distribution
// will be wired in a later phase; this layer keeps the call sites stable).
export const TrialService = {
  pool:      () => listAccounts({ data: { account_type: "trial", status: "available", limit: 500 } }),
  assigned:  () => listAccounts({ data: { account_type: "trial", status: "assigned", limit: 500 } }),
  reserve:   (id: string, customer_id: string) =>
                transitionAccount({ data: { id, action: "assign", customer_id } }),
};

// SubscriptionProvisionService — premium pool reservation / provisioning
export const SubscriptionProvisionService = {
  pool:      () => listAccounts({ data: { account_type: "premium", status: "available", limit: 500 } }),
  reserve:   (id: string, customer_id: string) =>
                transitionAccount({ data: { id, action: "assign", customer_id } }),
  activate:  (id: string) => transitionAccount({ data: { id, action: "activate" } }),
  renew:     (id: string, days = 30) => transitionAccount({ data: { id, action: "renew", days } }),
  suspend:   (id: string) => transitionAccount({ data: { id, action: "suspend" } }),
  expire:    (id: string) => transitionAccount({ data: { id, action: "expire" } }),
};

// ProviderHealthService — placeholder for future sync/healthcheck workflows
export const ProviderHealthService = {
  check:     (id: string) => checkProviderHealth({ data: { id } }),
  // Future: scheduled sync, status pull, expiration sweep, etc.
};

// Logs + dashboard
export const IPTVLogService = {
  list: (data?: any) => listIptvLogs({ data: data ?? {} }),
};
export const IPTVDashboardService = {
  kpis: () => iptvDashboard(),
};

// Synchronisation skeleton — no real provider calls yet.
export const IPTVSyncService = {
  /** Future: pull subscriptions from the active provider. */
  async pullSubscriptions(): Promise<{ pulled: number; skipped: true }> {
    return { pulled: 0, skipped: true };
  },
  /** Future: sweep accounts whose expires_at has passed → status=expired. */
  async sweepExpired(): Promise<{ swept: number; skipped: true }> {
    return { swept: 0, skipped: true };
  },
};