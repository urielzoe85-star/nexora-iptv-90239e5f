// Server fns — module Support (helpdesk).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

const StatusEnum = z.enum(["open", "pending", "resolved", "closed"]);
const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);

export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.enum(["all", "open", "pending", "resolved", "closed"]).default("all"),
      priority: z.enum(["all", "low", "normal", "high", "urgent"]).default("all"),
      search: z.string().trim().max(200).optional(),
      limit: z.number().int().min(10).max(200).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    let q = supabaseAdmin
      .from("support_tickets")
      .select("id, email, subject, status, priority, last_message_at, created_at, assigned_to, customer_id")
      .order("last_message_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.priority !== "all") q = q.eq("priority", data.priority);
    if (data.search) {
      const s = data.search;
      q = q.or(`email.ilike.%${s}%,subject.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetTicket = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: messages, error: mErr } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { ticket, messages: messages ?? [] };
  });

export const adminCreateTicket = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email(),
      subject: z.string().trim().min(2).max(200),
      body: z.string().trim().min(2).max(5000),
      priority: PriorityEnum.default("normal"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: t, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({ email: data.email, subject: data.subject, priority: data.priority, status: "open" })
      .select("id").single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await supabaseAdmin.from("support_messages").insert({
      ticket_id: t.id, author_type: "admin", author_user_id: context.userId, body: data.body,
    });
    if (mErr) throw new Error(mErr.message);
    return { id: t.id };
  });

export const adminReplyTicket = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      ticket_id: z.string().uuid(),
      body: z.string().trim().min(1).max(5000),
      newStatus: StatusEnum.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error: mErr } = await supabaseAdmin.from("support_messages").insert({
      ticket_id: data.ticket_id, author_type: "admin", author_user_id: context.userId, body: data.body,
    });
    if (mErr) throw new Error(mErr.message);
    const patch: Record<string, unknown> = { last_message_at: new Date().toISOString() };
    if (data.newStatus) patch.status = data.newStatus;
    const { error: uErr } = await (supabaseAdmin as any).from("support_tickets").update(patch).eq("id", data.ticket_id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const adminUpdateTicket = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: StatusEnum.optional(),
      priority: PriorityEnum.optional(),
      assigned_to: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    const { error } = await (supabaseAdmin as any).from("support_tickets").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTicketStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const statuses = ["open", "pending", "resolved", "closed"] as const;
    const counts: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await supabaseAdmin
        .from("support_tickets").select("id", { count: "exact", head: true }).eq("status", s);
      counts[s] = count ?? 0;
    }
    return counts;
  });