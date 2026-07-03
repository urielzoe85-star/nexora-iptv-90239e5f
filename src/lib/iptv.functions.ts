// Phase 1.4 — IPTV Automation Engine server functions.
// All handlers require an authenticated Supabase session and verify the
// caller has the 'admin' role. Service-role client is loaded INSIDE the
// handler (never at module scope) per project rules.

import { createServerFn } from "@tanstack/react-start";
import { requireNccUnlock } from "@/lib/require-ncc-unlock";
import { z } from "zod";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId, _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

async function audit(
  sb: any, actorId: string, action: string,
  opts: { provider_id?: string | null; account_id?: string | null; message?: string; payload?: Record<string, unknown> } = {},
) {
  try {
    await sb.from("iptv_logs").insert({
      actor_id: actorId,
      action,
      provider_id: opts.provider_id ?? null,
      account_id: opts.account_id ?? null,
      message: opts.message ?? null,
      payload: opts.payload ?? {},
    });
  } catch { /* never fail an operation because of audit */ }
}

// ─── PROVIDERS ─────────────────────────────────────────────────────────

const ProviderUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  api_url: z.string().trim().url().max(500).nullable().optional(),
  panel_url: z.string().trim().url().max(500).nullable().optional(),
  api_key: z.string().trim().max(500).nullable().optional(),
  username: z.string().trim().max(200).nullable().optional(),
  password: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["active", "inactive", "error"]).default("inactive"),
  is_default: z.boolean().default(false),
});

export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const { data, error } = await sb.from("iptv_providers")
      .select("*").order("is_default", { ascending: false }).order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProvider = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => ProviderUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    if (data.is_default) await sb.from("iptv_providers").update({ is_default: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    const payload = { ...data };
    let res;
    if (data.id) res = await sb.from("iptv_providers").update(payload).eq("id", data.id).select().single();
    else res = await sb.from("iptv_providers").insert(payload).select().single();
    if (res.error) throw new Error(res.error.message);
    await audit(sb, context.userId, data.id ? "provider.updated" : "provider.created", {
      provider_id: res.data.id, message: data.name,
    });
    return res.data;
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("iptv_providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "provider.deleted", { provider_id: data.id });
    return { ok: true };
  });

export const setDefaultProvider = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    await sb.from("iptv_providers").update({ is_default: false }).neq("id", data.id);
    const { error } = await sb.from("iptv_providers").update({ is_default: true, status: "active" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "provider.default_set", { provider_id: data.id });
    return { ok: true };
  });

export const toggleProviderStatus = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "inactive", "error"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("iptv_providers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "provider.status_changed", { provider_id: data.id, message: data.status });
    return { ok: true };
  });

// Health check (stub — to be wired to integration hub later)
export const checkProviderHealth = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: p } = await sb.from("iptv_providers").select("*").eq("id", data.id).single();
    const kind = ((p?.metadata as any)?.kind ?? "").toString();
    const isMegaott = kind === "megaott" || /megaott/i.test(p?.name ?? "");
    if (isMegaott && p?.api_url) {
      const { pingMegaott } = await import("@/integration-hub/connectors/iptv/megaott.adapter");
      const r = await pingMegaott(p.api_url);
      if (r.ok) {
        await audit(sb, context.userId, "provider.health_checked", {
          provider_id: data.id, message: "ok",
          payload: { status: r.value.status, durationMs: r.value.durationMs },
        });
        return { reachable: true, checked_at: new Date().toISOString(), details: r.value };
      }
      await audit(sb, context.userId, "provider.health_checked", {
        provider_id: data.id, message: r.error.message,
        payload: { kind: r.error.kind },
      });
      return { reachable: false, checked_at: new Date().toISOString(), details: { error: r.error.message } };
    }
    const reachable = Boolean(p?.api_url);
    await audit(sb, context.userId, "provider.health_checked", {
      provider_id: data.id, message: reachable ? "ok" : "no_api_url",
    });
    return { reachable, checked_at: new Date().toISOString() };
  });

// ─── ACCOUNTS ──────────────────────────────────────────────────────────

const ACC_STATUS = ["available", "assigned", "active", "expired", "suspended"] as const;
const ACC_TYPE = ["trial", "premium"] as const;

const AccountCreateSchema = z.object({
  provider_id: z.string().uuid().nullable().optional(),
  username: z.string().trim().min(1).max(200),
  password: z.string().trim().max(500).nullable().optional(),
  account_type: z.enum(ACC_TYPE).default("premium"),
  bouquet: z.string().trim().max(200).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const AccountUpdateSchema = AccountCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(ACC_STATUS).optional(),
});

export const listAccounts = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(ACC_STATUS).optional(),
    account_type: z.enum(ACC_TYPE).optional(),
    provider_id: z.string().uuid().optional(),
    expiring_within_days: z.number().int().min(1).max(365).optional(),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("iptv_accounts")
      .select("*, iptv_providers(name), customers(email,full_name)")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.account_type) q = q.eq("account_type", data.account_type);
    if (data.provider_id) q = q.eq("provider_id", data.provider_id);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`username.ilike.${s},bouquet.ilike.${s},notes.ilike.${s}`);
    }
    if (data.expiring_within_days) {
      const max = new Date(Date.now() + data.expiring_within_days * 86400_000).toISOString();
      q = q.lte("expires_at", max).gte("expires_at", new Date().toISOString());
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

async function ensureProvider(sb: any, provider_id?: string | null) {
  if (provider_id) return provider_id;
  const { data: def } = await sb.from("iptv_providers").select("id").eq("is_default", true).maybeSingle();
  return def?.id ?? null;
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => AccountCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const provider_id = await ensureProvider(sb, data.provider_id ?? null);
    const { data: row, error } = await sb.from("iptv_accounts").insert({
      ...data, provider_id, status: "available",
    }).select().single();
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "account.created", { account_id: row.id, provider_id });
    return row;
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => AccountUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { id, ...patch } = data;
    const { data: row, error } = await sb.from("iptv_accounts").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "account.updated", { account_id: id });
    return row;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("iptv_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "account.deleted", { account_id: data.id });
    return { ok: true };
  });

// State transitions
const TransitionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["assign", "activate", "suspend", "reactivate", "expire", "renew"]),
  customer_id: z.string().uuid().optional(),
  expires_at: z.string().datetime().optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

export const transitionAccount = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => TransitionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc, error: e1 } = await sb.from("iptv_accounts").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);

    const patch: Record<string, unknown> = {};
    switch (data.action) {
      case "assign":
        if (!data.customer_id) throw new Error("customer_id required");
        patch.customer_id = data.customer_id;
        patch.status = "assigned";
        patch.assigned_at = new Date().toISOString();
        break;
      case "activate":
        patch.status = "active";
        if (!acc.assigned_at) patch.assigned_at = new Date().toISOString();
        break;
      case "suspend":     patch.status = "suspended"; break;
      case "reactivate":  patch.status = "active"; break;
      case "expire":      patch.status = "expired"; break;
      case "renew": {
        const base = acc.expires_at ? new Date(acc.expires_at) : new Date();
        const ref  = base.getTime() < Date.now() ? new Date() : base;
        const ext  = data.days ?? 30;
        patch.expires_at = new Date(ref.getTime() + ext * 86400_000).toISOString();
        patch.status = "active";
        break;
      }
    }
    const { data: row, error } = await sb.from("iptv_accounts").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, `account.${data.action}`, {
      account_id: data.id, provider_id: acc.provider_id, payload: patch as Record<string, unknown>,
    });
    return row;
  });

// CSV import / export
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  });
}

export const importAccountsCsv = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    csv: z.string().min(1).max(2_000_000),
    account_type: z.enum(ACC_TYPE).default("trial"),
    provider_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const provider_id = await ensureProvider(sb, data.provider_id ?? null);
    const rows = parseCsv(data.csv);
    if (rows.length === 0) return { inserted: 0, errors: ["CSV vide"] };
    const payload = rows.map((r) => ({
      provider_id,
      account_type: data.account_type,
      username: r.username ?? r.user ?? "",
      password: r.password ?? r.pass ?? null,
      bouquet: r.bouquet ?? null,
      expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      notes: r.notes ?? null,
      status: "available",
    })).filter((r) => r.username.length > 0);

    const { data: ins, error } = await sb.from("iptv_accounts").insert(payload).select("id");
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, "pool.imported", {
      provider_id, message: `${ins?.length ?? 0} comptes`,
      payload: { account_type: data.account_type, count: ins?.length ?? 0 },
    });
    return { inserted: ins?.length ?? 0, errors: [] as string[] };
  });

export const exportAccountsCsv = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    account_type: z.enum(ACC_TYPE).optional(),
    status: z.enum(ACC_STATUS).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("iptv_accounts").select("username,password,account_type,bouquet,status,expires_at,notes");
    if (data.account_type) q = q.eq("account_type", data.account_type);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const header = "username,password,account_type,bouquet,status,expires_at,notes";
    const body = (rows ?? []).map((r: any) =>
      [r.username, r.password ?? "", r.account_type, r.bouquet ?? "", r.status, r.expires_at ?? "", (r.notes ?? "").replace(/[\n,]/g, " ")].join(","),
    ).join("\n");
    return { csv: `${header}\n${body}` };
  });

// ─── LOGS ──────────────────────────────────────────────────────────────

export const listIptvLogs = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    limit: z.number().int().min(1).max(500).default(200),
    action: z.string().max(80).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("iptv_logs").select("*, iptv_providers(name)")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── DASHBOARD ─────────────────────────────────────────────────────────

export const iptvDashboard = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const now = new Date();
    const inDay  = new Date(now.getTime() +      86400_000).toISOString();
    const inWeek = new Date(now.getTime() +  7 * 86400_000).toISOString();
    const last7  = new Date(now.getTime() -  7 * 86400_000).toISOString();
    const nowISO = now.toISOString();
    const c = (q: any) => q.then((r: any) => r.count ?? 0);
    const [available, active, trials, suspended, expiringToday, expiringWeek, newPremium, renewals] = await Promise.all([
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).eq("status", "available")),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).eq("status", "active")),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).eq("status", "available").eq("account_type", "trial")),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).eq("status", "suspended")),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).gte("expires_at", nowISO).lte("expires_at", inDay)),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).gte("expires_at", nowISO).lte("expires_at", inWeek)),
      c(sb.from("iptv_accounts").select("id", { count: "exact", head: true }).eq("account_type", "premium").eq("status", "active").gte("assigned_at", last7)),
      c(sb.from("iptv_logs").select("id", { count: "exact", head: true }).eq("action", "account.renew").gte("created_at", last7)),
    ]);
    return {
      available, active, trials_remaining: trials, suspended,
      expiring_today: expiringToday, expiring_week: expiringWeek,
      new_premium_7d: newPremium, renewals_7d: renewals,
    };
  });