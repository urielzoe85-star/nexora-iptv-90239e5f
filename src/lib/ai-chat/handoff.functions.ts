// Admin-only server functions to manage the human handoff inbox
// (visitor conversations that need or received a live admin reply).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const listHandoffThreads = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    let q = (supabaseAdmin as any)
      .from("ai_chat_threads")
      .select("id,title,handoff_status,assigned_admin_id,handoff_requested_at,updated_at,last_message_at,visitor_meta,session_id")
      .eq("scope", "client")
      .order("handoff_status", { ascending: true }) // 'human' < 'requested'? we re-sort in JS
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("handoff_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // Prioritise "requested" first, then "human", then rest
    const rank = (s: string) => (s === "requested" ? 0 : s === "human" ? 1 : s === "ai" ? 2 : 3);
    const threads = (rows ?? []).slice().sort((a: any, b: any) => rank(a.handoff_status) - rank(b.handoff_status));
    return { threads };
  });

export const getHandoffThread = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const [thread, messages] = await Promise.all([
      (supabaseAdmin as any)
        .from("ai_chat_threads")
        .select("id,title,handoff_status,assigned_admin_id,handoff_requested_at,handoff_started_at,handoff_closed_at,updated_at,last_message_at,visitor_meta,session_id,scope")
        .eq("id", data.threadId).single(),
      (supabaseAdmin as any)
        .from("ai_chat_messages")
        .select("id,role,sender,content,parts,created_at")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true }),
    ]);
    if (thread.error) throw new Error(thread.error.message);
    if (messages.error) throw new Error(messages.error.message);
    return { thread: thread.data, messages: messages.data ?? [] };
  });

export const takeOverHandoff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await (supabaseAdmin as any)
      .from("ai_chat_threads")
      .update({
        handoff_status: "human",
        assigned_admin_id: (context as any).userId,
        handoff_started_at: new Date().toISOString(),
        handoff_closed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const releaseHandoff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid(), mode: z.enum(["ai", "closed"]).default("ai") }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const patch: Record<string, unknown> = {
      handoff_status: data.mode,
      updated_at: new Date().toISOString(),
    };
    if (data.mode === "closed") patch.handoff_closed_at = new Date().toISOString();
    const { error } = await (supabaseAdmin as any).from("ai_chat_threads").update(patch).eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendAdminMessage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      threadId: z.string().uuid(),
      text: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    // Auto-takeover if not already human
    const { data: th } = await (supabaseAdmin as any)
      .from("ai_chat_threads").select("handoff_status").eq("id", data.threadId).single();
    if (th && th.handoff_status !== "human") {
      await (supabaseAdmin as any).from("ai_chat_threads").update({
        handoff_status: "human",
        assigned_admin_id: (context as any).userId,
        handoff_started_at: new Date().toISOString(),
      }).eq("id", data.threadId);
    }
    const now = new Date().toISOString();
    const parts = [{ type: "text", text: data.text }];
    const { data: row, error } = await (supabaseAdmin as any)
      .from("ai_chat_messages")
      .insert({
        thread_id: data.threadId,
        role: "assistant",
        sender: "admin",
        content: data.text,
        parts,
      })
      .select("id,created_at").single();
    if (error) throw new Error(error.message);
    await (supabaseAdmin as any).from("ai_chat_threads").update({
      updated_at: now,
      last_message_at: now,
    }).eq("id", data.threadId);
    return { ok: true, id: row?.id, created_at: row?.created_at };
  });

export const countPendingHandoffs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { count, error } = await (supabaseAdmin as any)
      .from("ai_chat_threads")
      .select("id", { count: "exact", head: true })
      .eq("scope", "client")
      .in("handoff_status", ["requested", "human"]);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });