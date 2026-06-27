// MEGAOTT — first official IPTV connector (NEXORA Phase 1.5).
//
// ALL outbound calls go through the Integration Hub's apiGateway, so we
// inherit timeout, retry, rate-limit, structured logging and metrics for
// free. Provider configuration (api_url, default package) is read from
// the iptv_providers row whose `metadata.kind = "megaott"`; the Bearer
// token is read from the server-only secret MEGAOTT_BEARER_TOKEN.
//
// Endpoints can be overridden per provider via
// metadata.endpoints.{createUser, getUser, suspendUser, reactivateUser,
// extendUser, health}. The defaults mirror the MEGAOTT reseller panel
// (`/api/v1/...`) but can be tuned without redeploying.

import { apiGateway } from "../../gateway/api-gateway";
import { integrationError, type IntegrationError } from "../../core/errors";
import { logger } from "../../core/logger";
import { secretsManager } from "../../core/secrets";
import { err, ok, type Result } from "../../core/result";
import type { IPTVConnector, IPTVCreateUserInput, IPTVUser } from "./types";

const CONNECTOR_ID = "iptv.megaott";
const TOKEN_SECRET = "MEGAOTT_BEARER_TOKEN";

export interface MegaottProviderConfig {
  apiUrl: string;
  endpoints?: Partial<{
    createUser: string;
    getUser: string;
    suspendUser: string;
    reactivateUser: string;
    extendUser: string;
    health: string;
  }>;
  defaultPackageId?: string | null;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function authHeaders(): Result<Record<string, string>, IntegrationError> {
  const t = secretsManager.require(TOKEN_SECRET);
  if (!t.ok) return t;
  return ok({
    Authorization: `Bearer ${t.value}`,
    Accept: "application/json",
  });
}

function mapStatus(s: unknown): IPTVUser["status"] {
  const v = String(s ?? "").toLowerCase();
  if (v === "active" || v === "1" || v === "enabled" || v === "true") return "active";
  if (v === "suspended" || v === "disabled" || v === "banned") return "suspended";
  return "expired";
}

function parseUser(json: any, fallbackUsername?: string): IPTVUser {
  const r = json?.data ?? json?.user ?? json ?? {};
  return {
    providerUserId: String(r.id ?? r.user_id ?? r.uuid ?? r.username ?? fallbackUsername ?? ""),
    username: String(r.username ?? r.user ?? fallbackUsername ?? ""),
    status: mapStatus(r.status ?? r.is_active ?? r.enabled),
    expiresAt: r.exp_date ?? r.expires_at ?? r.expiration ?? r.expire_at ?? null,
    m3uUrl: r.m3u_url ?? r.m3u ?? r.url ?? null,
  };
}

/** Resolve the configured MEGAOTT provider row (singleton). */
export async function resolveMegaottConfig(): Promise<Result<MegaottProviderConfig, IntegrationError>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("iptv_providers")
    .select("api_url, metadata, status")
    .or("metadata->>kind.eq.megaott,name.ilike.%megaott%")
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return err(integrationError("configuration", error.message, { connectorId: CONNECTOR_ID }));
  if (!data?.api_url) {
    return err(integrationError("configuration", "MEGAOTT provider is not configured (missing api_url)", { connectorId: CONNECTOR_ID }));
  }
  const meta = (data.metadata ?? {}) as any;
  return ok({
    apiUrl: data.api_url,
    endpoints: meta.endpoints ?? {},
    defaultPackageId: meta.default_package_id ?? null,
  });
}

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  override?: MegaottProviderConfig,
): Promise<Result<{ json: any }, IntegrationError>> {
  const cfg = override ? ok(override) : await resolveMegaottConfig();
  if (!cfg.ok) return cfg;
  const headers = authHeaders();
  if (!headers.ok) return headers;
  const res = await apiGateway.request({
    connectorId: CONNECTOR_ID,
    url: joinUrl(cfg.value.apiUrl, path),
    method,
    headers: headers.value,
    body,
    apiVersion: "v1",
    timeoutMs: 20_000,
    maxAttempts: 3,
    ratePerMinute: 60,
  });
  if (!res.ok) return res;
  return ok({ json: res.value.json });
}

export const megaottConnector: IPTVConnector = {
  id: CONNECTOR_ID,
  type: "iptv",
  label: "MEGAOTT",
  status: "enabled",

  isReady() {
    return secretsManager.has(TOKEN_SECRET);
  },

  async createUser(input: IPTVCreateUserInput) {
    if (!input.username) return err(integrationError("validation", "username is required", { connectorId: CONNECTOR_ID }));
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = cfg.value.endpoints?.createUser ?? "/api/v1/user";
    const packageId = input.packageId || cfg.value.defaultPackageId || "";
    const body: Record<string, unknown> = {
      username: input.username,
      password: input.password,
      package_id: packageId || undefined,
      bouquet_id: packageId || undefined,
      exp_date: input.expiresAt ?? undefined,
      ...(input.metadata ?? {}),
    };
    const r = await call<unknown>(path, "POST", body, cfg.value);
    if (!r.ok) {
      logger.warn("megaott.createUser failed", { kind: r.error.kind, status: r.error.status });
      return r;
    }
    return ok(parseUser(r.value.json, input.username));
  },

  async suspendUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.suspendUser ?? "/api/v1/user/{id}/suspend").replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "POST", { status: "suspended" }, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json));
  },

  async reactivateUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.reactivateUser ?? "/api/v1/user/{id}/activate").replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "POST", { status: "active" }, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json));
  },

  async extend(providerUserId, expiresAt) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.extendUser ?? "/api/v1/user/{id}").replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "PUT", { exp_date: expiresAt }, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json));
  },

  async getUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.getUser ?? "/api/v1/user/{id}").replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "GET", undefined, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json));
  },
};

/** Lightweight reachability check, used by the Providers UI. */
export async function pingMegaott(
  overrideUrl?: string,
): Promise<Result<{ status: number; durationMs: number }, IntegrationError>> {
  const headers = authHeaders();
  if (!headers.ok) return headers;
  let url = overrideUrl;
  if (!url) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    url = joinUrl(cfg.value.apiUrl, cfg.value.endpoints?.health ?? "/api/v1/user");
  }
  const res = await apiGateway.request({
    connectorId: CONNECTOR_ID,
    url,
    method: "GET",
    headers: headers.value,
    timeoutMs: 10_000,
    maxAttempts: 1,
    ratePerMinute: 30,
  });
  if (!res.ok) return res;
  return ok({ status: res.value.status, durationMs: res.value.durationMs });
}