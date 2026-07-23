// Get-or-create a visitor conversation thread keyed by a browser-generated sessionId.
// Server-only. Uses the admin client because the `client` scope threads are
// capability-scoped by their UUID once the browser knows it.
import type { SupabaseClient } from "@supabase/supabase-js";

export type VisitorMeta = {
  userAgent?: string;
  language?: string;
  referer?: string;
  path?: string;
  ip?: string;
};

export async function getOrCreateVisitorThread(
  sessionId: string,
  meta: VisitorMeta,
): Promise<{ id: string; handoff_status: string }> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const admin = supabaseAdmin as unknown as SupabaseClient;

  const { data: existing, error: qErr } = await admin
    .from("ai_chat_threads")
    .select("id, handoff_status, visitor_meta")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (existing) {
    // Refresh visitor meta best-effort (non-blocking on failure)
    await admin.from("ai_chat_threads").update({
      visitor_meta: { ...(existing as any).visitor_meta, ...meta, last_seen_at: new Date().toISOString() },
    }).eq("id", (existing as any).id);
    return { id: (existing as any).id, handoff_status: (existing as any).handoff_status };
  }

  const title = `Visiteur ${sessionId.slice(0, 8)}`;
  const { data: created, error: cErr } = await admin
    .from("ai_chat_threads")
    .insert({
      scope: "client",
      title,
      session_id: sessionId,
      visitor_meta: { ...meta, created_at: new Date().toISOString() },
      handoff_status: "ai",
    })
    .select("id, handoff_status").single();
  if (cErr) throw new Error(cErr.message);
  return { id: (created as any).id, handoff_status: (created as any).handoff_status };
}

export async function persistVisitorTurn(opts: {
  threadId: string;
  userParts?: unknown;
  userText?: string;
  assistantParts?: unknown;
  assistantText?: string;
  assistantSender?: "assistant" | "admin";
}): Promise<void> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const rows: Array<Record<string, unknown>> = [];
  if (opts.userText !== undefined || opts.userParts !== undefined) {
    rows.push({
      thread_id: opts.threadId,
      role: "user",
      sender: "visitor",
      content: opts.userText ?? "",
      parts: opts.userParts,
    });
  }
  if (opts.assistantParts && opts.assistantText) {
    rows.push({
      thread_id: opts.threadId,
      role: "assistant",
      sender: opts.assistantSender ?? "assistant",
      content: opts.assistantText,
      parts: opts.assistantParts,
    });
  }
  if (rows.length === 0) return;
  await (supabaseAdmin as any).from("ai_chat_messages").insert(rows);
  await (supabaseAdmin as any).from("ai_chat_threads")
    .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
    .eq("id", opts.threadId);
}