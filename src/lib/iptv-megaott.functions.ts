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
import { megaottConnector, megaottRawCall, pingMegaott, resolveMegaottConfig } from "@/integration-hub/connectors/iptv/megaott.adapter";

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

// Persist a full HTTP trace into integration_debug_logs (admin-only).
async function debugTrace(sb: any, actorId: string, operation: string, t: {
  url: string; method: string; requestHeaders: Record<string, string>; requestBody: unknown;
  status: number | null; responseBody: unknown; durationMs: number; attempts: number;
  ok: boolean; error: string | null;
}) {
  try {
    await sb.from("integration_debug_logs").insert({
      actor_id: actorId,
      connector_id: "iptv.megaott",
      operation,
      method: t.method,
      url: t.url,
      request_headers: t.requestHeaders ?? {},
      request_body: t.requestBody ?? null,
      status: t.status,
      response_body: t.responseBody ?? null,
      duration_ms: t.durationMs,
      attempts: t.attempts,
      ok: t.ok,
      error: t.error,
    });
  } catch { /* never fail an op for a debug log write */ }
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

// ─── Subscriptions (POST /api/v1/subscriptions) ──────────────────────
// Direct, 1:1 mapping to the official MEGAOTT API. The UI sends exactly
// these field names — no approximation, no remapping.

const SubscriptionSchema = z.object({
  type: z.enum(["m3u", "mag", "enigma"]),
  username: z.string().trim().min(1).max(120).optional(),
  mac: z.string().trim().min(1).max(60).optional(),
  package: z.union([z.string(), z.number()]).optional(),
  template: z.union([z.string(), z.number()]).optional(),
  max_connections: z.coerce.number().int().min(1).max(20).optional(),
  forced_country: z.string().trim().max(8).optional(),
  adult: z.coerce.boolean().optional(),
  whatsapp_telegram: z.string().trim().max(120).optional(),
  enable_vpn: z.coerce.boolean().optional(),
  paid: z.coerce.boolean().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const megaottCreateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubscriptionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    // Strip undefined keys so we send exactly what the operator entered.
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== "") body[k] = v;

    const cfg = await resolveMegaottConfig();
    const path = (cfg.ok && (cfg.value.endpoints as any)?.createSubscription) || "/api/v1/subscriptions";

    const trace = await megaottRawCall({ path, method: "POST", body });
    await debugTrace(sb, context.userId, "subscriptions.create", trace);

    if (!trace.ok) {
      await log(sb, context.userId, "megaott.subscription.failed", trace.error ?? "error", { status: trace.status, response: trace.responseBody });
      return {
        ok: false as const,
        error: trace.error ?? "Erreur inconnue",
        status: trace.status,
        response: trace.responseBody as any,
        trace,
      };
    }

    // The MEGAOTT response usually nests data under `data`. Be tolerant.
    const r: any = (trace.responseBody as any)?.data ?? trace.responseBody ?? {};
    const created = {
      id: r.id ?? r.subscription_id ?? null,
      username: r.username ?? data.username ?? null,
      password: r.password ?? null,
      package: r.package ?? r.package_name ?? data.package ?? null,
      template: r.template ?? r.template_name ?? data.template ?? null,
      expiration: r.expiration ?? r.exp_date ?? r.expires_at ?? null,
      dns_link: r.dns_link ?? null,
      dns_link_for_samsung_lg: r.dns_link_for_samsung_lg ?? null,
      portal_link: r.portal_link ?? null,
      mac: r.mac ?? data.mac ?? null,
      type: data.type,
    };

    // Persist into iptv_accounts so the new subscription appears immediately
    // in IPTV Manager. We store the full official response in metadata.
    const insertUsername = created.username ?? created.mac ?? `megaott_${Date.now()}`;
    const expiresIso = (() => {
      if (!created.expiration) return null;
      const d = new Date(created.expiration);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    })();

    const { data: provider } = await sb
      .from("iptv_providers")
      .select("id")
      .or("metadata->>kind.eq.megaott,name.ilike.%megaott%")
      .limit(1).maybeSingle();

    const { data: row, error: insErr } = await sb.from("iptv_accounts").insert({
      provider_id: provider?.id ?? null,
      username: insertUsername,
      password: created.password ?? null,
      account_type: "premium",
      bouquet: created.package ? String(created.package) : null,
      status: "active",
      expires_at: expiresIso,
      metadata: {
        provider: "megaott",
        remote_user_id: created.id ? String(created.id) : null,
        type: created.type,
        mac: created.mac,
        template: created.template,
        package: created.package,
        dns_link: created.dns_link,
        dns_link_for_samsung_lg: created.dns_link_for_samsung_lg,
        portal_link: created.portal_link,
        raw_response: trace.responseBody,
        created_at_remote: new Date().toISOString(),
      },
    }).select().single();

    if (insErr) {
      await log(sb, context.userId, "megaott.subscription.persist_failed", insErr.message, { created });
    } else {
      await log(sb, context.userId, "megaott.subscription.ok", String(created.id ?? ""), { type: created.type }, row?.id ?? null);
    }

    return {
      ok: true as const,
      status: trace.status,
      durationMs: trace.durationMs,
      created,
      account_id: row?.id ?? null,
      trace,
    };
  });

// ─── Debug log reader ────────────────────────────────────────────────

export const listIntegrationDebugLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    connector_id: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("integration_debug_logs").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.connector_id) q = q.eq("connector_id", data.connector_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── Semi-automatic delivery workflow (admin) ────────────────────────
// Le workflow "Créer abonnement MEGAOTT" depuis une commande utilise
// l'interface native MEGAOTT (popup). NEXORA persiste ensuite les infos
// que l'admin saisit manuellement.

/** Renvoie l'URL d'origine du panel MEGAOTT (sans `/api/v1`) pour `window.open`. */
export const getMegaottPanelUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await admin(context.userId);
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) return { ok: false as const, error: cfg.error.message, url: null };
    try {
      const u = new URL(cfg.value.apiUrl);
      return { ok: true as const, url: `${u.protocol}//${u.host}`, error: null };
    } catch {
      return { ok: true as const, url: cfg.value.apiUrl, error: null };
    }
  });

const DeliverySchema = z.object({
  order_id: z.string().uuid(),
  megaott_subscription_id: z.string().trim().max(120).optional().nullable(),
  username: z.string().trim().min(1).max(120),
  password: z.string().trim().min(1).max(255),
  package: z.string().trim().max(120).optional().nullable(),
  expires_at: z.string().trim().optional().nullable(),
  dns_link: z.string().trim().max(500).optional().nullable(),
  dns_link_samsung_lg: z.string().trim().max(500).optional().nullable(),
  portal_link: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

/**
 * Saisie manuelle des informations renvoyées par MEGAOTT après création
 * dans le panel natif. Crée la ligne iptv_accounts + met à jour la
 * commande (metadata.iptv_delivery).
 */
export const saveMegaottDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeliverySchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);

    const { data: order, error: oErr } = await sb
      .from("orders").select("id, email, full_name, metadata").eq("id", data.order_id).maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Commande introuvable");

    const expiresIso = (() => {
      if (!data.expires_at) return null;
      const d = new Date(data.expires_at);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    })();

    const { data: provider } = await sb
      .from("iptv_providers").select("id")
      .or("metadata->>kind.eq.megaott,name.ilike.%megaott%")
      .limit(1).maybeSingle();

    const { data: account, error: iErr } = await sb.from("iptv_accounts").insert({
      provider_id: provider?.id ?? null,
      username: data.username,
      password: data.password,
      account_type: "premium",
      bouquet: data.package ?? null,
      status: "active",
      expires_at: expiresIso,
      metadata: {
        provider: "megaott",
        source: "manual_panel_entry",
        remote_user_id: data.megaott_subscription_id ?? null,
        order_id: data.order_id,
        customer_email: order.email,
        dns_link: data.dns_link ?? null,
        dns_link_for_samsung_lg: data.dns_link_samsung_lg ?? null,
        portal_link: data.portal_link ?? null,
        note: data.note ?? null,
      },
    }).select("id").single();
    if (iErr) throw new Error(iErr.message);

    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    const nextMeta = {
      ...meta,
      iptv_delivery: {
        iptv_account_id: account.id,
        megaott_subscription_id: data.megaott_subscription_id ?? null,
        username: data.username,
        package: data.package ?? null,
        expires_at: expiresIso,
        dns_link: data.dns_link ?? null,
        dns_link_samsung_lg: data.dns_link_samsung_lg ?? null,
        portal_link: data.portal_link ?? null,
        note: data.note ?? null,
        delivery_status: "ready_to_send",
        created_at: new Date().toISOString(),
        sent_at: null,
        sent_channel: null,
      },
    };
    await sb.from("orders").update({ metadata: nextMeta }).eq("id", data.order_id);
    await log(sb, context.userId, "megaott.delivery.saved", data.username, { order_id: data.order_id }, account.id);
    return { ok: true as const, account_id: account.id };
  });

/** Marque la livraison comme envoyée par un canal (Email / WhatsApp / Telegram). */
export const markIptvDeliverySent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    order_id: z.string().uuid(),
    channel: z.enum(["email", "whatsapp", "telegram"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: order } = await sb.from("orders").select("id,email,full_name,metadata").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Commande introuvable");
    const meta = (order.metadata ?? {}) as Record<string, any>;
    const delivery = meta.iptv_delivery;
    if (!delivery?.iptv_account_id) throw new Error("Aucun abonnement IPTV lié à cette commande");

    const sentAt = new Date().toISOString();
    const nextMeta = {
      ...meta,
      iptv_delivery: { ...delivery, delivery_status: "sent", sent_at: sentAt, sent_channel: data.channel },
    };
    await sb.from("orders").update({ metadata: nextMeta }).eq("id", data.order_id);

    // Architecture only — l'envoi réel sera implémenté plus tard.
    await sb.from("notifications").insert({
      channel: data.channel,
      recipient: order.email,
      subject: `Vos accès IPTV — commande ${order.id.slice(0, 8)}`,
      body: `Identifiants MEGAOTT : ${delivery.username}`,
      status: "sent",
      sent_at: sentAt,
      payload: { order_id: order.id, delivery, stub: true },
    });

    await log(sb, context.userId, "iptv.delivery.sent", data.channel, { order_id: data.order_id }, delivery.iptv_account_id);
    return { ok: true as const, sent_at: sentAt };
  });