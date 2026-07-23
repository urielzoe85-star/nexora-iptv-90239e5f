// Admin-only streaming chat endpoint for the NCC Copilot.
// Requires a Supabase Bearer token belonging to an admin user.
// Persists messages to public.ai_chat_messages when a threadId is provided.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createNexoraAiProvider, NEXORA_DEFAULT_CHAT_MODEL } from "@/lib/ai-chat/gateway.server";
import { buildNccSystemPrompt } from "@/lib/ai-chat/system-prompts.server";
import { buildNccTools, type ToolContext } from "@/lib/ai-chat/tools.server";
import { requireAdminFromRequest } from "@/lib/ai-chat/server-auth.server";

export const Route = createFileRoute("/api/public/ai/chat/ncc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let user;
        try {
          user = await requireAdminFromRequest(request);
        } catch (r) {
          if (r instanceof Response) return r;
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string };
          if (!Array.isArray(body.messages)) return new Response("Messages required", { status: 400 });
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

          const threadId = body.threadId ?? null;
          const gateway = createNexoraAiProvider(key);
          const model = gateway(NEXORA_DEFAULT_CHAT_MODEL);

          const ctx: ToolContext = {
            scope: "ncc",
            threadId,
            actor: { userId: user.userId, email: user.email, label: user.email },
          };

          const system = await buildNccSystemPrompt(user.email);
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(body.messages),
            tools: buildNccTools(ctx),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages,
            onFinish: async ({ messages }) => {
              if (!threadId) return;
              try {
                const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
                const last = messages[messages.length - 1];
                const prev = messages[messages.length - 2];
                const rows: Array<Record<string, unknown>> = [];
                if (prev && prev.role === "user") {
                  rows.push({
                    thread_id: threadId,
                    role: "user",
                    parts: prev.parts as unknown,
                    content: (prev.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n"),
                  });
                }
                if (last && last.role === "assistant") {
                  rows.push({
                    thread_id: threadId,
                    role: "assistant",
                    parts: last.parts as unknown,
                    content: (last.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n"),
                  });
                }
                if (rows.length) {
                  await (supabaseAdmin as any).from("ai_chat_messages").insert(rows);
                  await (supabaseAdmin as any).from("ai_chat_threads")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", threadId);
                }
              } catch (e) {
                console.warn("[ncc chat] persist failed:", e);
              }
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});