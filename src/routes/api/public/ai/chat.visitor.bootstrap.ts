// Public endpoint: given a browser sessionId, return the persisted thread ID,
// the current handoff status and message history so the widget can resume the
// conversation across reloads and subscribe to realtime updates.
import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateVisitorThread } from "@/lib/ai-chat/visitor-thread.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/ai/chat/visitor/bootstrap")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { sessionId?: string };
          const sessionId = (body.sessionId ?? "").trim();
          if (!sessionId) return new Response("sessionId required", { status: 400, headers: cors });
          const meta = {
            userAgent: request.headers.get("user-agent") ?? undefined,
            language: request.headers.get("accept-language") ?? undefined,
            referer: request.headers.get("referer") ?? undefined,
          };
          const thread = await getOrCreateVisitorThread(sessionId, meta);
          const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
          const { data: msgs } = await (supabaseAdmin as any)
            .from("ai_chat_messages")
            .select("id,role,sender,parts,content,created_at")
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: true })
            .limit(200);
          return Response.json(
            { threadId: thread.id, handoffStatus: thread.handoff_status, messages: msgs ?? [] },
            { headers: cors },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(msg, { status: 500, headers: cors });
        }
      },
    },
  },
});