// Phase 3 — NCC server functions.
// All handlers run server-side, require an authenticated Supabase session,
// and verify the caller has the 'admin' role. Inside the handler we use
// the service-role client (RLS bypassed) so the explicit role check is the
// only gate. Top-level imports must stay client-safe; only handler bodies
// load `client.server`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ORDER_TRANSITIONS,
  NOTIFICATION_CHANNELS,
  PRODUCT_CATEGORIES,
  type DashboardKpis,
} from "@/domain/types";

// ─── helpers ────────────────────────────────────────────────────────────

async function getAdminContext(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin;
}

const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ─── CUSTOMERS ──────────────────────────────────────────────────────────

const CustomerCreateSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1).max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(2).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const CustomerUpdateSchema = CustomerCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    PaginationSchema.extend({
      search: z.string().trim().max(200).optional(),
      status: z.enum(["active", "disabled"]).optional(),
      sort: z.enum(["created_at", "email", "full_name"]).default("created_at"),
      direction: z.enum(["asc", "desc"]).default("desc"),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb.from("customers").select("*", { count: "exact" });
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`email.ilike.${s},full_name.ilike.${s},phone.ilike.${s}`);
    }
    if (data.status) q = q.eq("status", data.status);
    q = q.order(data.sort, { ascending: data.direction === "asc" }).range(from, to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.pageSize };
  });

export const getCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const [{ data: customer, error }, { data: events }, { data: orders }, { data: subs }, { data: trials }] =
      await Promise.all([
        sb.from("customers").select("*").eq("id", data.id).maybeSingle(),
        sb.from("customer_events").select("*").eq("customer_id", data.id).order("created_at", { ascending: false }).limit(50),
        sb.from("orders").select("order_ref,plan_name,amount,currency,status,method,created_at").eq("customer_id", data.id).order("created_at", { ascending: false }).limit(50),
        sb.from("subscriptions").select("*").eq("customer_id", data.id).order("created_at", { ascending: false }),
        sb.from("trials").select("*").eq("customer_id", data.id).order("created_at", { ascending: false }),
      ]);
    if (error) throw new Error(error.message);
    if (!customer) throw new Error("Customer not found");
    return { customer, events: events ?? [], orders: orders ?? [], subscriptions: subs ?? [], trials: trials ?? [] };
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CustomerCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: row, error } = await sb
      .from("customers")
      .insert({
        email: data.email,
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("customer_events").insert({
      customer_id: row.id, type: "created", actor_id: context.userId, payload: {},
    });
    return row;
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CustomerUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { id, ...patch } = data;
    const { data: row, error } = await sb
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("customer_events").insert({
      customer_id: id, type: "updated", actor_id: context.userId, payload: patch,
    });
    return row;
  });

export const setCustomerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "disabled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { error } = await sb.from("customers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await sb.from("customer_events").insert({
      customer_id: data.id, type: `status:${data.status}`, actor_id: context.userId, payload: {},
    });
    return { ok: true };
  });

// ─── PRODUCTS ───────────────────────────────────────────────────────────

const ProductCreateSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3).default("USD"),
  category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]]),
  status: z.enum(["active", "archived"]).default("active"),
  image_url: z.string().trim().url().max(1000).nullable().optional(),
});

const ProductUpdateSchema = ProductCreateSchema.partial().extend({ id: z.string().uuid() });

export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]]).optional(),
      status: z.enum(["active", "archived"]).optional(),
      search: z.string().trim().max(200).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    let q = sb.from("products").select("*").order("created_at", { ascending: false });
    if (data.category) q = q.eq("category", data.category);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`name.ilike.${s},sku.ilike.${s},description.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: row, error } = await sb.from("products").insert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { id, ...patch } = data;
    const { data: row, error } = await sb.from("products").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// ─── ORDERS ─────────────────────────────────────────────────────────────

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    PaginationSchema.extend({
      status: z.string().max(40).optional(),
      search: z.string().trim().max(200).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb.from("orders").select("*", { count: "exact" });
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`order_ref.ilike.${s},email.ilike.${s},full_name.ilike.${s},plan_name.ilike.${s}`);
    }
    q = q.order("created_at", { ascending: false }).range(from, to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.pageSize };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: order, error } = await sb.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    let customer = null;
    if (order.customer_id) {
      const { data } = await sb.from("customers").select("id,email,full_name,phone,metadata").eq("id", order.customer_id).maybeSingle();
      customer = data;
    }
    return { order, customer };
  });

export const transitionOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      next: z.enum(["pending", "paid", "processing", "completed", "cancelled", "refunded"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: current, error: e1 } = await sb.from("orders").select("status").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!current) throw new Error("Order not found");
    const allowed = ORDER_TRANSITIONS[current.status as keyof typeof ORDER_TRANSITIONS] ?? [];
    if (!allowed.includes(data.next)) {
      throw new Error(`Transition ${current.status} → ${data.next} non autorisée.`);
    }
    const { error } = await sb.from("orders").update({ status: data.next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const linkOrderToCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), customer_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { error } = await sb.from("orders").update({ customer_id: data.customer_id }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── PAYMENTS (read-only view of orders for now) ────────────────────────

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    PaginationSchema.extend({
      status: z.string().max(40).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb.from("orders").select("id,order_ref,email,amount,currency,method,status,sebpay_reference,created_at", { count: "exact" });
    if (data.status) q = q.eq("status", data.status);
    q = q.order("created_at", { ascending: false }).range(from, to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.pageSize };
  });

// ─── TRIALS ─────────────────────────────────────────────────────────────

export const listTrials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await getAdminContext(context.userId);
    const { data, error } = await sb
      .from("trials")
      .select("*, customers(email, full_name), products(name, sku)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      customer_id: z.string().uuid(),
      product_id: z.string().uuid().nullable().optional(),
      expires_at: z.string().datetime().nullable().optional(),
      notes: z.string().trim().max(2000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: row, error } = await sb
      .from("trials")
      .insert({
        customer_id: data.customer_id,
        product_id: data.product_id ?? null,
        expires_at: data.expires_at ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setTrialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "expired", "converted", "revoked"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { error } = await sb.from("trials").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── SUBSCRIPTIONS (IPTV) ───────────────────────────────────────────────

export const listSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await getAdminContext(context.userId);
    const { data, error } = await sb
      .from("subscriptions")
      .select("*, customers(email, full_name), products(name, sku, category)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      customer_id: z.string().uuid(),
      product_id: z.string().uuid().nullable().optional(),
      expires_at: z.string().datetime().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: row, error } = await sb
      .from("subscriptions")
      .insert({
        customer_id: data.customer_id,
        product_id: data.product_id ?? null,
        expires_at: data.expires_at ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const transitionSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["activate", "suspend", "expire", "cancel", "renew"]),
      extend_days: z.number().int().min(1).max(3650).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { data: current, error: e1 } = await sb.from("subscriptions").select("expires_at").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!current) throw new Error("Subscription not found");
    const now = new Date();
    const patch: {
      status?: "pending" | "active" | "suspended" | "expired" | "cancelled";
      started_at?: string;
      renewed_at?: string;
      expires_at?: string;
    } = {};
    switch (data.action) {
      case "activate":
        patch.status = "active";
        patch.started_at = now.toISOString();
        break;
      case "suspend": patch.status = "suspended"; break;
      case "expire":  patch.status = "expired"; break;
      case "cancel":  patch.status = "cancelled"; break;
      case "renew": {
        const base = current.expires_at && new Date(current.expires_at) > now ? new Date(current.expires_at) : now;
        base.setUTCDate(base.getUTCDate() + (data.extend_days ?? 30));
        patch.status = "active";
        patch.renewed_at = now.toISOString();
        patch.expires_at = base.toISOString();
        break;
      }
    }
    const { error } = await sb.from("subscriptions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── NOTIFICATIONS CENTER ───────────────────────────────────────────────

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      channel: z.enum(NOTIFICATION_CHANNELS as [string, ...string[]]).optional(),
      status: z.enum(["queued", "sent", "failed"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    let q = sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.channel) q = q.eq("channel", data.channel);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      channel: z.enum(NOTIFICATION_CHANNELS as [string, ...string[]]),
      recipient: z.string().trim().min(1).max(500),
      subject: z.string().trim().max(300).nullable().optional(),
      body: z.string().trim().max(10000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminContext(context.userId);
    const { getNotificationChannel } = await import("@/domain/providers/notifications");
    const adapter = getNotificationChannel(data.channel as never);
    const { data: row, error } = await sb
      .from("notifications")
      .insert({
        channel: data.channel,
        recipient: data.recipient,
        subject: data.subject ?? null,
        body: data.body ?? null,
        status: "queued",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const result = await adapter.send({
      recipient: data.recipient, subject: data.subject ?? null, body: data.body ?? null,
    });
    await sb.from("notifications").update({
      status: result.status,
      error: result.error ?? null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    }).eq("id", row.id);
    return { ok: true, id: row.id, status: result.status };
  });

// ─── DASHBOARD KPIs ─────────────────────────────────────────────────────

export const getDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardKpis> => {
    const sb = await getAdminContext(context.userId);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [c1, p1, s1, t1, o1, o24, rev] = await Promise.all([
      sb.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("trials").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("orders").select("id", { count: "exact", head: true }),
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      sb.from("orders").select("amount,currency,status").in("status", ["paid", "completed", "processing"]),
    ]);
    let revenue_total = 0;
    let revenue_currency = "USD";
    for (const r of rev.data ?? []) {
      revenue_total += Number(r.amount ?? 0);
      revenue_currency = r.currency ?? revenue_currency;
    }
    return {
      customers_active: c1.count ?? 0,
      products_active: p1.count ?? 0,
      subscriptions_active: s1.count ?? 0,
      trials_active: t1.count ?? 0,
      orders_total: o1.count ?? 0,
      orders_24h: o24.count ?? 0,
      revenue_total,
      revenue_currency,
    };
  });