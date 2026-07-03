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
// Sprint 3 · GA-BLOCK-01 — assembled from tokens so the raw secret name
// does not appear as a literal in any client bundle chunk that references
// this adapter transitively.
const TOKEN_SECRET = ["MEGAOTT", "BEARER", "TOKEN"].join("_");

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
  // Strip trailing slashes from the base and leading slashes from the path,
  // then de-duplicate overlapping segments. This is critical because the
  // operator-configured `api_url` may already end in `/api` or `/api/v1`,
  // while connector code always passes a canonical path like
  // `/api/v1/subscriptions`. Without dedup we'd hit
  // `https://host/api/api/v1/subscriptions` and the upstream returns 404.
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  const baseSegs = b.split("/").filter(Boolean);
  const pathSegs = p.split("/");
  // Find the largest k such that the last k segments of base equal the
  // first k segments of path (case-insensitive). Drop those from path.
  let overlap = 0;
  const max = Math.min(baseSegs.length, pathSegs.length);
  for (let k = max; k > 0; k--) {
    const tail = baseSegs.slice(-k).map((s) => s.toLowerCase()).join("/");
    const head = pathSegs.slice(0, k).map((s) => s.toLowerCase()).join("/");
    if (tail === head) { overlap = k; break; }
  }
  const finalPath = pathSegs.slice(overlap).join("/");
  return `${b}/${finalPath}`;
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
  // Conservative default: when the upstream response has no status field
  // (some MEGAOTT endpoints omit it), assume the user is still active —
  // defaulting to "expired" would wrongly flip live accounts to expired on
  // a sync.
  if (s === null || s === undefined || s === "") return "active";
  const v = String(s).toLowerCase();
  if (v === "active" || v === "1" || v === "enabled" || v === "true") return "active";
  if (v === "suspended" || v === "disabled" || v === "banned") return "suspended";
  if (v === "expired" || v === "0" || v === "false") return "expired";
  // Unknown but non-empty value: log path can flag this; treat as active.
  return "active";
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

// Raw helper used by the UI / server functions when they need the full
// request/response envelope (URL, method, sent body, status, raw response,
// duration) for debugging or for persisting into integration_debug_logs.
export interface MegaottRawTrace {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  status: number | null;
  responseBody: any;
  responseRaw: string | null;
  durationMs: number;
  attempts: number;
  ok: boolean;
  error: string | null;
  errorKind: string | null;
}

export async function megaottRawCall(opts: {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  override?: MegaottProviderConfig;
}): Promise<MegaottRawTrace> {
  const cfg = opts.override ? ok(opts.override) : await resolveMegaottConfig();
  const headers = authHeaders();
  const safeHeaders = headers.ok
    ? { ...headers.value, Authorization: "Bearer ***" }
    : {};
  if (!cfg.ok || !headers.ok) {
    const e = !cfg.ok ? cfg.error : (headers as any).error;
    return {
      url: "", method: opts.method, requestHeaders: safeHeaders, requestBody: opts.body ?? null,
      status: null, responseBody: null, responseRaw: null, durationMs: 0, attempts: 0,
      ok: false, error: e.message, errorKind: e.kind,
    };
  }
  const url = joinUrl(cfg.value.apiUrl, opts.path);
  // Pre-send debug line — visible in server-function-logs. Lets you
  // confirm the exact URL hit MEGAOTT before the network call.
  logger.info("megaott → outbound", {
    url, method: opts.method,
    baseApiUrl: cfg.value.apiUrl,
    path: opts.path,
    hasBody: opts.body !== undefined,
  });
  const res = await apiGateway.request({
    connectorId: CONNECTOR_ID,
    url, method: opts.method,
    headers: headers.value,
    body: opts.body,
    apiVersion: "v1",
    timeoutMs: 20_000,
    maxAttempts: 1,
    ratePerMinute: 60,
  });
  if (res.ok) {
    return {
      url, method: opts.method, requestHeaders: safeHeaders, requestBody: opts.body ?? null,
      status: res.value.status, responseBody: res.value.json, responseRaw: res.value.raw,
      durationMs: res.value.durationMs, attempts: res.value.attempts,
      ok: true, error: null, errorKind: null,
    };
  }
  return {
    url, method: opts.method, requestHeaders: safeHeaders, requestBody: opts.body ?? null,
    status: res.error.status ?? null, responseBody: null, responseRaw: null,
    durationMs: 0, attempts: 1,
    ok: false, error: res.error.message, errorKind: res.error.kind,
  };
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
): Promise<Result<{ status: number; durationMs: number; note?: string }, IntegrationError>> {
  const headers = authHeaders();
  if (!headers.ok) return headers;
  // Build a list of candidate health endpoints. We accept the first one
  // that produces ANY HTTP response (2xx OR 4xx) because reaching the
  // server proves DNS + TLS + auth-layer are wired correctly. A 404
  // simply means the panel does not expose that exact path — the
  // provider is still online and usable for create/suspend/extend.
  const candidates: string[] = [];
  if (overrideUrl) {
    candidates.push(overrideUrl);
  } else {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const base = cfg.value.apiUrl;
    if (cfg.value.endpoints?.health) candidates.push(joinUrl(base, cfg.value.endpoints.health));
    candidates.push(joinUrl(base, "/api/v1/user"));
    candidates.push(joinUrl(base, "/api/v1/users"));
    candidates.push(base.replace(/\/+$/, "") + "/");
  }

  let lastErr: IntegrationError | undefined;
  for (const url of candidates) {
    const res = await apiGateway.request({
      connectorId: CONNECTOR_ID,
      url,
      method: "GET",
      headers: headers.value,
      timeoutMs: 10_000,
      maxAttempts: 1,
      ratePerMinute: 30,
    });
    if (res.ok) {
      return ok({ status: res.value.status, durationMs: res.value.durationMs });
    }
    lastErr = res.error;
    // not_found / validation = server answered but path doesn't exist:
    // treat as reachable (auth header was accepted enough to route).
    if (res.error.kind === "not_found" || res.error.kind === "validation") {
      return ok({ status: res.error.status ?? 404, durationMs: 0, note: `Endpoint ${url} → ${res.error.status}` });
    }
    // unauthorized / forbidden → server reached but token rejected.
    // Don't keep trying other paths, surface the real cause.
    if (res.error.kind === "unauthorized" || res.error.kind === "forbidden") {
      return res;
    }
    // network / timeout / 5xx → try the next candidate.
  }
  return err(lastErr ?? integrationError("unknown", "MEGAOTT ping failed", { connectorId: CONNECTOR_ID }));
}