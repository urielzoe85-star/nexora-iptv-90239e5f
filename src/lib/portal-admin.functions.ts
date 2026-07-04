import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

export const listAdminRenewalPlans = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const sb = await admin();
    const { data } = await sb
      .from("renewal_plans")
      .select("*")
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

export const upsertRenewalPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        duration_months: z.number().int().positive(),
        name: z.string().trim().min(1).max(80),
        price: z.number().nonnegative(),
        currency: z.string().trim().length(3).default("USD"),
        description: z.string().trim().max(500).optional().nullable(),
        active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await sb.from("renewal_plans").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id };
    }
    const { data: row, error } = await sb.from("renewal_plans").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const deleteRenewalPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("renewal_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAdminRenewalOrders = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.string().trim().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    let q = sb
      .from("orders")
      .select("order_ref, email, plan_name, amount, currency, method, status, created_at, metadata")
      .eq("metadata->>kind", "renewal")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const listAdminPortalSessions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const sb = await admin();
    const { data } = await sb
      .from("client_portal_sessions")
      .select("id, email, expires_at, last_seen_at, ip, user_agent, revoked_at, created_at")
      .order("last_seen_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const listAdminAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const sb = await admin();
    const { data } = await sb
      .from("portal_announcements")
      .select("*")
      .order("published_at", { ascending: false });
    return data ?? [];
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(200),
        body: z.string().trim().min(1).max(4000),
        severity: z.enum(["info", "warning", "critical"]).default("info"),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await sb.from("portal_announcements").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id };
    }
    const { data: row, error } = await sb.from("portal_announcements").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("portal_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });