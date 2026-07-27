// IPTV Import & Inventory server functions.
// Tous les handlers exigent une session admin (has_role admin).

import { createServerFn } from "@tanstack/react-start";
import { requireNccUnlock } from "@/lib/require-ncc-unlock";
import { z } from "zod";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

// Format officiel MEGAOTT — colonnes attendues dans l'export.
export const MEGAOTT_COLUMNS = [
  "Username", "Password", "Mac", "Code", "Type", "Owner", "Package", "DNS",
  "Paid", "Trial", "Expiration Date", "Max Connections", "Forced Country",
  "Enabled", "Admin Enabled", "Last Login", "Last IP",
  "Reseller Notes", "Admin Notes", "Created At",
] as const;

// Normalisation : "Max Connections" → "maxconnections"
function norm(s: string): string {
  return String(s ?? "").toLowerCase().replace(/[\s_\-\.]+/g, "");
}

// Aliases acceptés (clé = champ NEXORA, valeurs = variations possibles dans l'en-tête)
const COLUMN_ALIASES: Record<string, string[]> = {
  username:        ["username", "user", "login"],
  password:        ["password", "pass"],
  mac:             ["mac", "macaddress", "macaddr"],
  code:            ["code"],
  type:            ["type"],
  owner:           ["owner", "reseller"],
  package:         ["package", "bouquet", "plan"],
  dns:             ["dns", "dnslink", "url", "m3u"],
  paid:            ["paid"],
  trial:           ["trial"],
  expires_at:      ["expirationdate", "expiration", "expiresat", "expirydate", "expdate"],
  max_connections: ["maxconnections", "connections", "maxconn"],
  forced_country:  ["forcedcountry", "country"],
  enabled:         ["enabled"],
  admin_enabled:   ["adminenabled"],
  last_login:      ["lastlogin"],
  last_ip:         ["lastip", "ip"],
  reseller_notes:  ["resellernotes", "notes"],
  admin_notes:     ["adminnotes"],
  created_at:      ["createdat", "creationdate", "datecreated"],
};

// Détecte automatiquement la map { champ_nexora: colonne_source }.
export function detectMegaottMapping(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const lookup = new Map(headers.map(h => [norm(h), h]));
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      const h = lookup.get(a);
      if (h) { out[field] = h; break; }
    }
  }
  return out;
}

// ─── Parse file ─────────────────────────────────────────────────────────

const ParseSchema = z.object({
  filename: z.string().min(1).max(255),
  format: z.enum(["csv", "xls", "xlsx"]),
  base64: z.string().min(1).max(20 * 1024 * 1024), // ~15 MB base64
});

function base64ToUint8(b64: string): Uint8Array {
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const parseIptvImportFile = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => ParseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await admin(context.userId);
    const bytes = base64ToUint8(data.base64);

    let headers: string[] = [];
    let rows: Record<string, any>[] = [];

    if (data.format === "csv") {
      const Papa = (await import("papaparse")).default;
      const text = new TextDecoder("utf-8").decode(bytes);
      const parsed = Papa.parse<Record<string, any>>(text, {
        header: true, skipEmptyLines: true, dynamicTyping: false,
      });
      headers = (parsed.meta.fields ?? []).map(String);
      rows = (parsed.data ?? []) as Record<string, any>[];
    } else {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(bytes, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Fichier vide");
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: false });
      rows = json;
      headers = json.length > 0 ? Object.keys(json[0]) : [];
    }

    return {
      headers,
      sample: rows.slice(0, 10),
      rows,
      totalRows: rows.length,
    };
  });

// ─── Commit import ──────────────────────────────────────────────────────

const CommitSchema = z.object({
  filename: z.string().min(1).max(255),
  file_format: z.enum(["csv", "xls", "xlsx"]),
  rows: z.array(z.record(z.string(), z.any())).max(20000),
  dedupe_strategy: z.enum(["skip", "update"]).default("skip"),
});

function pick(row: Record<string, any>, mapping: Record<string, string>, field: string): string | null {
  const col = mapping[field];
  if (!col) return null;
  const v = row[col];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function pickBool(row: Record<string, any>, mapping: Record<string, string>, field: string): boolean | null {
  const v = pick(row, mapping, field);
  if (v == null) return null;
  if (/^(1|true|yes|y|oui|on|paid|enabled)$/i.test(v)) return true;
  if (/^(0|false|no|n|non|off|unpaid|disabled)$/i.test(v)) return false;
  return null;
}

function pickInt(row: Record<string, any>, mapping: Record<string, string>, field: string): number | null {
  const v = pick(row, mapping, field);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseDate(v: string | null): string | null {
  if (!v) return null;
  // Try direct ISO first
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // Try DD/MM/YYYY
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d2 = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
    if (!Number.isNaN(d2.getTime())) return d2.toISOString();
  }
  return null;
}

export const commitIptvImport = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => CommitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);

    // Auto-detect mapping from headers of first row.
    const headers = data.rows[0] ? Object.keys(data.rows[0]) : [];
    const mapping = detectMegaottMapping(headers);
    if (!mapping.username) throw new Error("Colonne 'Username' introuvable dans le fichier — vérifiez que l'export provient bien de MEGAOTT.");

    // Create batch first.
    const { data: batch, error: bErr } = await sb.from("iptv_import_batches").insert({
      filename: data.filename,
      file_format: data.file_format,
      row_count: data.rows.length,
      imported_by: context.userId,
      mapping_snapshot: mapping,
    }).select("id").single();
    if (bErr) throw new Error(bErr.message);

    let inserted = 0, updated = 0, skipped = 0, errors = 0;
    const errorSamples: string[] = [];

    for (const row of data.rows) {
      try {
        const username = pick(row, mapping, "username");
        if (!username) { skipped++; continue; }

        const trialFlag = pickBool(row, mapping, "trial");
        const accountType: "trial" | "premium" =
          trialFlag === true ? "trial"
          : (() => {
              const t = pick(row, mapping, "type");
              if (t && /trial|essai|free/i.test(t)) return "trial" as const;
              return "premium" as const;
            })();

        const payload: Record<string, any> = {
          username,
          password: pick(row, mapping, "password"),
          package: pick(row, mapping, "package"),
          expires_at: parseDate(pick(row, mapping, "expires_at")),
          dns_link: pick(row, mapping, "dns"),
          mac: pick(row, mapping, "mac"),
          mac_address: pick(row, mapping, "mac"),
          code: pick(row, mapping, "code"),
          owner: pick(row, mapping, "owner"),
          paid: pickBool(row, mapping, "paid"),
          trial: trialFlag,
          forced_country: pick(row, mapping, "forced_country"),
          enabled: pickBool(row, mapping, "enabled"),
          admin_enabled: pickBool(row, mapping, "admin_enabled"),
          last_login: parseDate(pick(row, mapping, "last_login")),
          last_ip: pick(row, mapping, "last_ip"),
          reseller_notes: pick(row, mapping, "reseller_notes"),
          admin_notes: pick(row, mapping, "admin_notes"),
          source_created_at: parseDate(pick(row, mapping, "created_at")),
          max_connections: pickInt(row, mapping, "max_connections"),
          notes: pick(row, mapping, "reseller_notes"),
          account_type: accountType,
          imported_at: new Date().toISOString(),
          import_batch_id: batch.id,
        };

        // Dédup : Username est l'identifiant officiel MEGAOTT.
        const { data: e } = await sb.from("iptv_accounts")
          .select("id, status").ilike("username", username).limit(1).maybeSingle();
        const existing = e as { id: string; status: string } | null;

        if (existing) {
          if (data.dedupe_strategy === "skip") { skipped++; continue; }
          // update — preserve assignment status if already assigned/delivered
          const protect = ["assigned", "delivered"].includes(existing.status);
          const patch: Record<string, any> = { ...payload };
          if (protect) { delete patch.account_type; }
          // Don't override status on update
          const { error: uErr } = await sb.from("iptv_accounts").update(patch).eq("id", existing.id);
          if (uErr) throw uErr;
          updated++;
        } else {
          const { error: iErr } = await sb.from("iptv_accounts").insert({
            ...payload,
            status: "available",
            metadata: { source: "import", batch_id: batch.id, filename: data.filename },
          });
          if (iErr) throw iErr;
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push((e as Error).message ?? String(e));
      }
    }

    await sb.from("iptv_import_batches").update({
      inserted_count: inserted, updated_count: updated, skipped_count: skipped, error_count: errors,
      notes: errorSamples.length ? `Errors: ${errorSamples.join(" | ")}` : null,
    }).eq("id", batch.id);

    return { batch_id: batch.id, inserted, updated, skipped, errors };
  });

// ─── Import batches ────────────────────────────────────────────────────

export const listImportBatches = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const { data, error } = await sb.from("iptv_import_batches")
      .select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─── Mappings ──────────────────────────────────────────────────────────

export const listImportMappings = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const { data, error } = await sb.from("iptv_import_mappings")
      .select("*").order("is_default", { ascending: false }).order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveImportMapping = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    mapping: z.record(z.string(), z.string()),
    is_default: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    if (data.is_default) {
      await sb.from("iptv_import_mappings").update({ is_default: false })
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const payload = { name: data.name, mapping: data.mapping, is_default: data.is_default, created_by: context.userId };
    const res = data.id
      ? await sb.from("iptv_import_mappings").update(payload).eq("id", data.id).select().single()
      : await sb.from("iptv_import_mappings").insert(payload).select().single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteImportMapping = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { error } = await sb.from("iptv_import_mappings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Inventory / KPIs ──────────────────────────────────────────────────

export const iptvInventoryKpis = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async ({ context }) => {
    const sb = await admin(context.userId);
    const { data, error } = await sb.from("iptv_accounts").select("status, package, account_type, expires_at, paid, trial");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const byStatus: Record<string, number> = {};
    const byPackage: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let paid = 0, trial = 0;
    const now = Date.now();
    let expiringSoon = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      const pkg = r.package ?? "—";
      byPackage[pkg] = (byPackage[pkg] ?? 0) + 1;
      byType[r.account_type] = (byType[r.account_type] ?? 0) + 1;
      if (r.paid === true) paid++;
      if (r.trial === true) trial++;
      if (r.expires_at) {
        const t = new Date(r.expires_at).getTime();
        if (!Number.isNaN(t) && t - now < 7 * 86_400_000 && t > now) expiringSoon++;
      }
    }
    return { total: rows.length, byStatus, byPackage, byType, expiringSoon, paid, trial };
  });

export const listInventoryAccounts = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    status: z.string().optional(),
    account_type: z.enum(["trial", "premium"]).optional(),
    package: z.string().optional(),
    search: z.string().optional(),
    expiring_within_days: z.number().int().min(0).max(365).optional(),
    only_available: z.boolean().optional(),
    paid: z.boolean().optional(),
    trial: z.boolean().optional(),
    min_connections: z.number().int().min(0).max(1000).optional(),
    limit: z.number().int().min(1).max(1000).default(500),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    let q = sb.from("iptv_accounts").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.only_available) q = q.eq("status", "available");
    else if (data.status) q = q.eq("status", data.status);
    if (data.account_type) q = q.eq("account_type", data.account_type);
    if (data.package) q = q.eq("package", data.package);
    if (typeof data.paid === "boolean") q = q.eq("paid", data.paid);
    if (typeof data.trial === "boolean") q = q.eq("trial", data.trial);
    if (typeof data.min_connections === "number") q = q.gte("max_connections", data.min_connections);
    if (data.search) q = q.ilike("username", `%${data.search}%`);
    if (data.expiring_within_days) {
      const cutoff = new Date(Date.now() + data.expiring_within_days * 86_400_000).toISOString();
      q = q.lte("expires_at", cutoff).gte("expires_at", new Date().toISOString());
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── Assignment ────────────────────────────────────────────────────────

export const assignIptvAccountToOrder = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({
    order_id: z.string().uuid(),
    account_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);

    const { data: order, error: oErr } = await sb.from("orders")
      .select("id, email, full_name, metadata").eq("id", data.order_id).maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Commande introuvable");

    const meta = (order.metadata ?? {}) as Record<string, any>;
    const existingDelivery = meta.iptv_delivery ?? null;
    if (existingDelivery?.iptv_account_id && existingDelivery.delivery_status !== "failed") {
      throw new Error("Un abonnement est déjà affecté à cette commande");
    }

    const { data: acc, error: aErr } = await sb.from("iptv_accounts")
      .select("*").eq("id", data.account_id).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!acc) throw new Error("Abonnement introuvable");
    if (acc.status !== "available") throw new Error(`Abonnement non disponible (statut: ${acc.status})`);

    const { error: uErr } = await sb.from("iptv_accounts").update({
      status: "assigned",
      order_id: data.order_id,
      customer_id: (meta as any).customer_id ?? acc.customer_id ?? null,
      assigned_at: new Date().toISOString(),
    }).eq("id", data.account_id);
    if (uErr) throw new Error(uErr.message);

    const { buildDeliveryFromAccount } = await import("@/lib/iptv-delivery.builder.server");
    const delivery = await buildDeliveryFromAccount({ account: acc, order, previous: existingDelivery });
    const nextMeta = { ...meta, iptv_delivery: delivery };
    await sb.from("orders").update({ metadata: nextMeta }).eq("id", data.order_id);

    try {
      await sb.from("iptv_logs").insert({
        actor_id: context.userId, action: "iptv.account.assigned",
        account_id: acc.id, message: `Affecté à commande ${data.order_id}`,
        payload: { order_id: data.order_id },
      });
    } catch { /* noop */ }

    return { ok: true, account_id: acc.id };
  });

export const releaseIptvAccount = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) => z.object({ account_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);
    const { data: acc } = await sb.from("iptv_accounts").select("order_id").eq("id", data.account_id).maybeSingle();
    const orderId = acc?.order_id ?? null;
    await sb.from("iptv_accounts").update({
      status: "available", order_id: null, assigned_at: null, customer_id: null,
    }).eq("id", data.account_id);
    if (orderId) {
      const { data: o } = await sb.from("orders").select("metadata").eq("id", orderId).maybeSingle();
      if (o) {
        const meta = (o.metadata ?? {}) as Record<string, any>;
        delete meta.iptv_delivery;
        await sb.from("orders").update({ metadata: meta }).eq("id", orderId);
      }
    }
    try {
      await sb.from("iptv_logs").insert({
        actor_id: context.userId, action: "iptv.account.released",
        account_id: data.account_id, message: orderId ? `Détaché de commande ${orderId}` : "Libéré",
      });
    } catch { /* noop */ }
    return { ok: true };
  });