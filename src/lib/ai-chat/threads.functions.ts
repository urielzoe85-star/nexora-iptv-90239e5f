// Server functions to manage NCC copilot threads and their messages.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const listMyThreads = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("ai_chat_threads")
      .select("id,title,updated_at,archived")
      .eq("owner_user_id", (context as any).userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { threads: data ?? [] };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ title: z.string().min(1).max(160).default("Nouvelle conversation") }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("ai_chat_threads")
      .insert({ owner_user_id: (context as any).userId, scope: "ncc", title: data.title })
      .select("id,title,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("ai_chat_messages")
      .select("id,role,content,parts,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await (supabaseAdmin as any).from("ai_chat_threads").delete().eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(160) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await (supabaseAdmin as any).from("ai_chat_threads")
      .update({ title: data.title }).eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });