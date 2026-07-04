// Server fn — Snapshot analytics NCC.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const getAnalyticsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const sinceDate = new Date(Date.now() - data.days * 86400_000);
    const since = sinceDate.toISOString();

    const [{ data: orders }, { data: customers }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("orders").select("status, amount, currency, plan_name, created_at").gte("created_at", since),
      supabaseAdmin.from("customers").select("id, created_at").gte("created_at", since),
      supabaseAdmin.from("subscriptions").select("id, status"),
    ]);

    const all = orders ?? [];
    const paid = all.filter((o) => o.status === "paid" || o.status === "completed");
    const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
    const aov = paid.length ? revenue / paid.length : 0;
    const conv = all.length ? (paid.length / all.length) * 100 : 0;
    const activeSubs = (subs ?? []).filter((s: any) => s.status === "active").length;

    // Séries journalières
    const days: Record<string, { revenue: number; orders: number }> = {};
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 };
    }
    for (const o of all) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (k in days) days[k].orders += 1;
    }
    for (const o of paid) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (k in days) days[k].revenue += Number(o.amount || 0);
    }
    const series = Object.entries(days).map(([date, v]) => ({ date, ...v }));

    // Top plans
    const byPlan: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const o of paid) {
      const k = o.plan_name ?? "—";
      if (!byPlan[k]) byPlan[k] = { name: k, count: 0, revenue: 0 };
      byPlan[k].count += 1;
      byPlan[k].revenue += Number(o.amount || 0);
    }
    const topPlans = Object.values(byPlan).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      days: data.days,
      revenue,
      ordersTotal: all.length,
      ordersPaid: paid.length,
      aov: Math.round(aov * 100) / 100,
      conversion: Math.round(conv * 10) / 10,
      newCustomers: customers?.length ?? 0,
      activeSubscriptions: activeSubs,
      series,
      topPlans,
    };
  });