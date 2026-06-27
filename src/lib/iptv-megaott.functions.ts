// MEGAOTT server functions — admin-only entry points the UI / automation
// call to interact with MEGAOTT through the Integration Hub.
//
// IMPORTANT: never bypass `connectorRegistry.require("iptv.megaott")` —
// that abstraction is what lets future providers be swapped in without
// touching the business code.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import "@/integration-hub"; // ensure connectors are registered
import { connectorRegistry } from "@/integration-hub/core/registry";
import type { IPTVConnector } from "@/integration-hub/connectors/iptv/types";
import { megaottConnector, pingMegaott, resolveMegaottConfig } from "@/integration-hub/connectors/iptv/megaott.adapter";

// Defensive registration: in server-fn bundles the barrel side-effect
// import above can be split into a different module instance than the
// registry imported here, leaving this isolate with an empty registry.
// Registering directly guarantees the connector is available on every
// invocation regardless of bundler layout.
if (!connectorRegistry.has("iptv.megaott")) {
  connectorRegistry.register(megaottConnector);
}

const CONNECTOR_ID = "iptv.megaott";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

function getConnector(): IPTVConnector {
  return connectorRegistry.require<IPTVConnector>(CONNECTOR_ID);
}

async function log(sb: any, actorId: string, action: string, message: string, payload: Record<string, unknown> = {}, account_id: string | null = null) {
  try { await sb.from("iptv_logs").insert({ actor_id: actorId, action, message, payload, account_id }); } catch { /* noop */ }
}

// ─── Status / Health ───────────────────────────────────────────────────

export const megaottStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await admin(context.userId);
    const c = getConnector();
    const cfg = await resolveMegaottConfig();
    return {
      connectorId: c.id,
      label: c.label,
      ready: c.isReady(),
      tokenConfigured: c.isReady(),
      providerConfigured: cfg.ok,
      apiUrl: cfg.ok ? cfg.value.apiUrl : null,
      defaultPackageId: cfg.ok ? cfg.value.defaultPackageId : null,
      error: cfg.ok ? null : cfg.error.message,
    };
  });

export const megaottPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const r = await pingMegaott(data.url);
    await log(sb, context.userId, "megaott.ping", r.ok ? "ok" : r.error.message, r.ok ? { status: r.value.status, durationMs: r.value.durationMs } : { kind: r.error.kind });
    if (!r.ok) return { ok: false as const, error: r.error.message, kind: r.error.kind };
    return { ok: true as const, status: r.value.status, durationMs: r.value.durationMs };
  });

// ─── Remote user lifecycle (via Hub) ──────────────────────────────────

/** Provision a remote MEGAOTT user from a local iptv_accounts row. */
export const megaottCreateRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    account_id: z.string().uuid(),
    package_id: z.string().trim().max(120).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc, error } = await sb.from("iptv_accounts").select("*").eq("id", data.account_id).single();
    if (error) throw new Error(error.message);
    const c = getConnector();
    const r = await c.createUser({
      username: acc.username,
      password: acc.password ?? undefined,
      packageId: data.package_id ?? (acc.bouquet ?? ""),
      expiresAt: acc.expires_at ?? undefined,
    });
    if (!r.ok) {
      await log(sb, context.userId, "megaott.create.failed", r.error.message, { kind: r.error.kind }, data.account_id);
      return { ok: false as const, error: r.error.message, kind: r.error.kind };
    }
    const meta = { ...(acc.metadata ?? {}), remote_user_id: r.value.providerUserId, m3u_url: r.value.m3uUrl ?? null, provider: "megaott", last_sync_at: new Date().toISOString() };
    await sb.from("iptv_accounts").update({ metadata: meta, status: "active" }).eq("id", data.account_id);
    await log(sb, context.userId, "megaott.create.ok", r.value.providerUserId, { username: r.value.username }, data.account_id);
    return { ok: true as const, user: r.value };
  });

export const megaottSuspendRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ account_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc } = await sb.from("iptv_accounts").select("metadata").eq("id", data.account_id).single();
    const remoteId = (acc?.metadata as any)?.remote_user_id;
    if (!remoteId) return { ok: false as const, error: "Compte sans remote_user_id MEGAOTT" };
    const r = await getConnector().suspendUser(remoteId);
    await log(sb, context.userId, r.ok ? "megaott.suspend.ok" : "megaott.suspend.failed", r.ok ? remoteId : r.error.message, {}, data.account_id);
    if (!r.ok) return { ok: false as const, error: r.error.message };
    await sb.from("iptv_accounts").update({ status: "suspended" }).eq("id", data.account_id);
    return { ok: true as const, user: r.value };
  });

export const megaottReactivateRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ account_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc } = await sb.from("iptv_accounts").select("metadata").eq("id", data.account_id).single();
    const remoteId = (acc?.metadata as any)?.remote_user_id;
    if (!remoteId) return { ok: false as const, error: "Compte sans remote_user_id MEGAOTT" };
    const r = await getConnector().reactivateUser(remoteId);
    await log(sb, context.userId, r.ok ? "megaott.reactivate.ok" : "megaott.reactivate.failed", r.ok ? remoteId : r.error.message, {}, data.account_id);
    if (!r.ok) return { ok: false as const, error: r.error.message };
    await sb.from("iptv_accounts").update({ status: "active" }).eq("id", data.account_id);
    return { ok: true as const, user: r.value };
  });

export const megaottExtendRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    account_id: z.string().uuid(),
    days: z.number().int().min(1).max(3650).default(30),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc } = await sb.from("iptv_accounts").select("metadata, expires_at").eq("id", data.account_id).single();
    const remoteId = (acc?.metadata as any)?.remote_user_id;
    if (!remoteId) return { ok: false as const, error: "Compte sans remote_user_id MEGAOTT" };
    const base = acc?.expires_at ? new Date(acc.expires_at) : new Date();
    const ref = base.getTime() < Date.now() ? new Date() : base;
    const next = new Date(ref.getTime() + data.days * 86_400_000).toISOString();
    const r = await getConnector().extend(remoteId, next);
    await log(sb, context.userId, r.ok ? "megaott.extend.ok" : "megaott.extend.failed", r.ok ? remoteId : r.error.message, { next }, data.account_id);
    if (!r.ok) return { ok: false as const, error: r.error.message };
    await sb.from("iptv_accounts").update({ status: "active", expires_at: next }).eq("id", data.account_id);
    return { ok: true as const, user: r.value };
  });

export const megaottSyncRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ account_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc } = await sb.from("iptv_accounts").select("metadata").eq("id", data.account_id).single();
    const remoteId = (acc?.metadata as any)?.remote_user_id;
    if (!remoteId) return { ok: false as const, error: "Compte sans remote_user_id MEGAOTT" };
    const r = await getConnector().getUser(remoteId);
    if (!r.ok) {
      await log(sb, context.userId, "megaott.sync.failed", r.error.message, {}, data.account_id);
      return { ok: false as const, error: r.error.message };
    }
    const meta = { ...(acc?.metadata ?? {}), remote_status: r.value.status, m3u_url: r.value.m3uUrl ?? null, last_sync_at: new Date().toISOString() };
    const patch: Record<string, unknown> = { metadata: meta };
    if (r.value.expiresAt) patch.expires_at = r.value.expiresAt;
    await sb.from("iptv_accounts").update(patch).eq("id", data.account_id);
    await log(sb, context.userId, "megaott.sync.ok", remoteId, { status: r.value.status }, data.account_id);
    return { ok: true as const, user: r.value };
  });