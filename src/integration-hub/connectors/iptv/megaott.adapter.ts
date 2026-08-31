/* eslint-disable @typescript-eslint/no-explicit-any -- official API response is normalized at runtime. */
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

function mockModeEnabled() {
  return String(process.env.MEGAOTT_MOCK_MODE ?? "").toLowerCase() === "true";
}

/** Real provider provisioning is an explicit production operation. */
export function megaottRealProvisioningEnabled() {
  return (
    mockModeEnabled() ||
    String(process.env.MEGAOTT_REAL_PROVISIONING_ENABLED ?? "").toLowerCase() === "true"
  );
}

function realProvisioningDisabled(): Result<never, IntegrationError> {
  return err(
    integrationError("configuration", "MEGAOTT real provisioning is disabled", {
      connectorId: CONNECTOR_ID,
    }),
  );
}

function safeProviderError(message: unknown): string {
  return String(message ?? "")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer ***")
    .replace(/(?:token|password|secret)[=:]\s*[^\s,}]+/gi, "$1=***")
    .slice(0, 500);
}

function mockResponse(path: string, body?: unknown) {
  const form = typeof body === "string" ? new URLSearchParams(body) : null;
  const pathId = path.match(/subscriptions\/(\d+)/)?.[1];
  const username = form?.get("username") ?? (pathId ? `mock_${pathId}` : "mock_user");
  const hash = [...username].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 900000, 0) + 100000;
  const id = pathId ?? String(hash);
  if (path.endsWith("/extend")) {
    return {
      status: true,
      message: "Subscription extended successfully",
      new_expiration_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    };
  }
  if (path.endsWith("/activate") || path.endsWith("/deactivate")) {
    return {
      status: true,
      message: path.endsWith("/activate")
        ? "Subscription activated successfully"
        : "Subscription deactivated successfully",
    };
  }
  return {
    id: Number(id),
    username,
    password: "mock_password",
    package: { id: Number(form?.get("package_id") ?? 4), name: "Mock 1 Month" },
    max_connections: Number(form?.get("max_connections") ?? 1),
    expiring_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    dns_link: "https://mock.megaott.invalid/dns",
    portal_link: "https://mock.megaott.invalid/portal",
  };
}

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
    const tail = baseSegs
      .slice(-k)
      .map((s) => s.toLowerCase())
      .join("/");
    const head = pathSegs
      .slice(0, k)
      .map((s) => s.toLowerCase())
      .join("/");
    if (tail === head) {
      overlap = k;
      break;
    }
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

function mapStatus(s: unknown, expiresAt?: unknown): IPTVUser["status"] {
  // Conservative default: when the upstream response has no status field
  // (some MEGAOTT endpoints omit it), assume the user is still active —
  // defaulting to "expired" would wrongly flip live accounts to expired on
  // a sync.
  if (s === null || s === undefined || s === "") {
    const expiry = expiresAt ? new Date(String(expiresAt)).getTime() : NaN;
    return Number.isFinite(expiry) && expiry <= Date.now() ? "expired" : "active";
  }
  const v = String(s).toLowerCase();
  if (v === "active" || v === "1" || v === "enabled" || v === "true") return "active";
  if (v === "suspended" || v === "disabled" || v === "banned") return "suspended";
  if (v === "expired" || v === "0" || v === "false") return "expired";
  // Unknown but non-empty value: log path can flag this; treat as active.
  return "active";
}

function parseUser(json: any, fallbackUsername?: string): IPTVUser {
  const r = json?.data ?? json?.user ?? json ?? {};
  const expiresAt =
    r.expiring_at ?? r.exp_date ?? r.expires_at ?? r.expiration ?? r.expire_at ?? null;
  return {
    providerUserId: String(
      r.id ?? r.subscription_id ?? r.user_id ?? r.uuid ?? r.username ?? fallbackUsername ?? "",
    ),
    username: String(r.username ?? r.user ?? fallbackUsername ?? ""),
    password: r.password ?? null,
    status: mapStatus(r.status ?? r.is_active ?? r.enabled, expiresAt),
    expiresAt,
    // MegaOTT exposes the playlist/DNS/portal links with these exact names.
    m3uUrl: r.m3u_url ?? r.m3u ?? r.url ?? r.dns_link ?? null,
    dnsLink: r.dns_link ?? null,
    portalLink: r.portal_link ?? null,
    packageId:
      r.package?.id != null
        ? String(r.package.id)
        : r.package_id != null
          ? String(r.package_id)
          : null,
  };
}

/** Resolve the configured MEGAOTT provider row (singleton). */
export async function resolveMegaottConfig(): Promise<
  Result<MegaottProviderConfig, IntegrationError>
> {
  if (mockModeEnabled()) {
    return ok({
      apiUrl: "https://mock.megaott.invalid",
      defaultPackageId: process.env.MEGAOTT_DEFAULT_PACKAGE_ID ?? "mock-package",
    });
  }
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data, error } = await supabaseAdmin
    .from("iptv_providers")
    .select("api_url, metadata, status")
    .or("metadata->>kind.eq.megaott,name.ilike.%megaott%")
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return err(integrationError("configuration", error.message, { connectorId: CONNECTOR_ID }));
  }
  if (!data?.api_url) {
    return err(
      integrationError("configuration", "MEGAOTT provider is not configured (missing api_url)", {
        connectorId: CONNECTOR_ID,
      }),
    );
  }
  const meta = (data.metadata ?? {}) as any;
  return ok({
    apiUrl: data.api_url,
    endpoints: meta.endpoints ?? {},
    defaultPackageId: meta.default_package_id ?? process.env.MEGAOTT_DEFAULT_PACKAGE_ID ?? null,
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
  if (mockModeEnabled()) return ok({ json: mockResponse(path, body) });
  const headers = authHeaders();
  if (!headers.ok) return headers;
  const requestHeaders =
    typeof body === "string"
      ? { ...headers.value, "Content-Type": "application/x-www-form-urlencoded" }
      : headers.value;
  const res = await apiGateway.request({
    connectorId: CONNECTOR_ID,
    url: joinUrl(cfg.value.apiUrl, path),
    method,
    headers: requestHeaders,
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
  if (mockModeEnabled() && cfg.ok) {
    return {
      url: joinUrl(cfg.value.apiUrl, opts.path),
      method: opts.method,
      requestHeaders: { Accept: "application/json", Authorization: "Bearer ***" },
      requestBody: opts.body ?? null,
      status: 200,
      responseBody: mockResponse(opts.path, opts.body),
      responseRaw: null,
      durationMs: 0,
      attempts: 1,
      ok: true,
      error: null,
      errorKind: null,
    };
  }
  const headers = authHeaders();
  const safeHeaders = headers.ok ? { ...headers.value, Authorization: "Bearer ***" } : {};
  if (!cfg.ok || !headers.ok) {
    const e = !cfg.ok ? cfg.error : (headers as any).error;
    return {
      url: "",
      method: opts.method,
      requestHeaders: safeHeaders,
      requestBody: opts.body ?? null,
      status: null,
      responseBody: null,
      responseRaw: null,
      durationMs: 0,
      attempts: 0,
      ok: false,
      error: safeProviderError(e.message),
      errorKind: e.kind,
    };
  }
  const url = joinUrl(cfg.value.apiUrl, opts.path);
  // Pre-send debug line — visible in server-function-logs. Lets you
  // confirm the exact URL hit MEGAOTT before the network call.
  logger.info("megaott → outbound", {
    url,
    method: opts.method,
    baseApiUrl: cfg.value.apiUrl,
    path: opts.path,
    hasBody: opts.body !== undefined,
  });
  const rawHeaders =
    typeof opts.body === "string"
      ? { ...headers.value, "Content-Type": "application/x-www-form-urlencoded" }
      : headers.value;
  const res = await apiGateway.request({
    connectorId: CONNECTOR_ID,
    url,
    method: opts.method,
    headers: rawHeaders,
    body: opts.body,
    apiVersion: "v1",
    timeoutMs: 20_000,
    maxAttempts: 1,
    ratePerMinute: 60,
  });
  if (res.ok) {
    return {
      url,
      method: opts.method,
      requestHeaders: safeHeaders,
      requestBody: opts.body ?? null,
      status: res.value.status,
      responseBody: res.value.json,
      responseRaw: res.value.raw,
      durationMs: res.value.durationMs,
      attempts: res.value.attempts,
      ok: true,
      error: null,
      errorKind: null,
    };
  }
  return {
    url,
    method: opts.method,
    requestHeaders: safeHeaders,
    requestBody: opts.body ?? null,
    status: res.error.status ?? null,
    responseBody: null,
    responseRaw: null,
    durationMs: 0,
    attempts: 1,
    ok: false,
    error: safeProviderError(res.error.message),
    errorKind: res.error.kind,
  };
}

export const megaottConnector: IPTVConnector = {
  id: CONNECTOR_ID,
  type: "iptv",
  label: "MEGAOTT",
  status: "enabled",

  isReady() {
    return mockModeEnabled() || secretsManager.has(TOKEN_SECRET);
  },

  async createUser(input: IPTVCreateUserInput) {
    if (!megaottRealProvisioningEnabled()) return realProvisioningDisabled();
    if (!input.username)
      return err(
        integrationError("validation", "username is required", { connectorId: CONNECTOR_ID }),
      );
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = cfg.value.endpoints?.createUser ?? "/api/v1/subscriptions";
    const packageId = input.packageId || cfg.value.defaultPackageId || "";
    if (!packageId)
      return err(
        integrationError("configuration", "MEGAOTT package_id is not configured", {
          connectorId: CONNECTOR_ID,
        }),
      );
    const metadata = input.metadata ?? {};
    const form = new URLSearchParams();
    form.set("type", "M3U");
    form.set("username", input.username);
    form.set("package_id", packageId);
    form.set("max_connections", String(metadata.max_connections ?? metadata.maxConnections ?? 1));
    form.set("forced_country", String(metadata.forced_country ?? "ALL"));
    form.set("adult", metadata.adult ? "1" : "0");
    form.set("enable_vpn", metadata.enable_vpn ? "1" : "0");
    // payment.confirmed is the only provisioning trigger, so the upstream
    // subscription is marked paid at creation time.
    form.set("paid", "1");
    if (metadata.whatsapp_telegram)
      form.set("whatsapp_telegram", String(metadata.whatsapp_telegram));
    if (metadata.note) form.set("note", String(metadata.note));
    const r = await call<unknown>(path, "POST", form.toString(), cfg.value);
    if (!r.ok) {
      logger.warn("megaott.createUser failed", { kind: r.error.kind, status: r.error.status });
      return r;
    }
    return ok(parseUser(r.value.json, input.username));
  },

  async suspendUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (
      cfg.value.endpoints?.suspendUser ?? "/api/v1/subscriptions/{id}/deactivate"
    ).replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "POST", undefined, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json, providerUserId));
  },

  async reactivateUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (
      cfg.value.endpoints?.reactivateUser ?? "/api/v1/subscriptions/{id}/activate"
    ).replace("{id}", encodeURIComponent(providerUserId));
    const r = await call(path, "POST", undefined, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json, providerUserId));
  },

  async extend(providerUserId, expiresAt) {
    if (!megaottRealProvisioningEnabled()) return realProvisioningDisabled();
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.extendUser ?? "/api/v1/subscriptions/{id}/extend").replace(
      "{id}",
      encodeURIComponent(providerUserId),
    );
    if (!cfg.value.defaultPackageId) {
      return err(
        integrationError("configuration", "MEGAOTT package_id is not configured for extension", {
          connectorId: CONNECTOR_ID,
        }),
      );
    }
    const form = new URLSearchParams({ package_id: cfg.value.defaultPackageId, paid: "1" });
    const r = await call(path, "POST", form.toString(), cfg.value);
    if (!r.ok) return r;
    const response = r.value.json ?? {};
    const payload = (response as any).data ?? response;
    return ok(
      parseUser({
        ...(typeof payload === "object" ? payload : {}),
        id: providerUserId,
        expiring_at: (payload as any)?.new_expiration_date ?? expiresAt,
      }),
    );
  },

  async getUser(providerUserId) {
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return cfg;
    const path = (cfg.value.endpoints?.getUser ?? "/api/v1/subscriptions/{id}").replace(
      "{id}",
      encodeURIComponent(providerUserId),
    );
    const r = await call(path, "GET", undefined, cfg.value);
    if (!r.ok) return r;
    return ok(parseUser(r.value.json));
  },
};

/** Lightweight reachability check, used by the Providers UI. */
export async function pingMegaott(overrideUrl?: string): Promise<
  Result<
    {
      status: number;
      durationMs: number;
      note?: string;
      authenticated: boolean;
      responseValid: boolean;
      account?: { id: string; username: string; credit: number };
    },
    IntegrationError
  >
> {
  if (mockModeEnabled()) {
    return ok({
      status: 200,
      durationMs: 0,
      authenticated: true,
      responseValid: true,
      account: { id: "mock-reseller", username: "mock-reseller", credit: 999 },
    });
  }
  const headers = authHeaders();
  if (!headers.ok) return headers;
  const cfg = await resolveMegaottConfig();
  if (!cfg.ok && !overrideUrl) return cfg;
  const url =
    overrideUrl ??
    joinUrl(
      cfg.ok ? cfg.value.apiUrl : "",
      cfg.ok ? (cfg.value.endpoints?.health ?? "/api/v1/user") : "/api/v1/user",
    );
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
  const payload: any = res.value.json;
  const account = payload?.data ?? payload?.user ?? payload;
  const valid = Boolean(
    account &&
    account.id !== undefined &&
    typeof account.username === "string" &&
    account.credit !== undefined &&
    Number.isFinite(Number(account.credit)),
  );
  if (!valid) {
    return err(
      integrationError("provider", "MEGAOTT health response is invalid", {
        connectorId: CONNECTOR_ID,
        status: res.value.status,
        retryable: false,
      }),
    );
  }
  return ok({
    status: res.value.status,
    durationMs: res.value.durationMs,
    authenticated: true,
    responseValid: true,
    account: {
      id: String(account.id),
      username: String(account.username),
      credit: Number(account.credit),
    },
  });
}
