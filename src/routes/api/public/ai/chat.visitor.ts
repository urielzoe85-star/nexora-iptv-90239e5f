// Public streaming chat endpoint for the floating Nexora Assistant widget.
// No auth: available to any site visitor. Uses Lovable AI Gateway.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStreamResponse, streamText, type UIMessage } from "ai";
import { createNexoraAiProvider, NEXORA_DEFAULT_CHAT_MODEL } from "@/lib/ai-chat/gateway.server";
import { buildClientSystemPrompt } from "@/lib/ai-chat/system-prompts.server";
import { buildClientTools, type ToolContext } from "@/lib/ai-chat/tools.server";
import { getOrCreateVisitorThread, persistVisitorTurn } from "@/lib/ai-chat/visitor-thread.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/ai/chat/visitor")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { messages?: UIMessage[]; sessionId?: string };
          if (!Array.isArray(body.messages)) {
            return new Response("Messages required", { status: 400, headers: corsHeaders });
          }
          const sessionId = (body.sessionId ?? "").trim();
          if (!sessionId) return new Response("sessionId required", { status: 400, headers: corsHeaders });
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500, headers: corsHeaders });

          const meta = {
            userAgent: request.headers.get("user-agent") ?? undefined,
            language: request.headers.get("accept-language") ?? undefined,
            referer: request.headers.get("referer") ?? undefined,
          };
          const thread = await getOrCreateVisitorThread(sessionId, meta);

          // If a human admin has taken over, do NOT call the model.
          // Persist the visitor turn only and return an empty UI-message stream.
          const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
          if (thread.handoff_status === "human" || thread.handoff_status === "requested") {
            if (lastUser) {
              const text = (lastUser.parts ?? [])
                .filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
              await persistVisitorTurn({
                threadId: thread.id, userParts: lastUser.parts, userText: text,
              });
            }
            // No model call while a human is handling the thread.
            // Return a well-formed empty UI-message stream so the SDK
            // closes cleanly; admin replies arrive via the polling bootstrap.
            return createUIMessageStreamResponse({
              execute: () => {},
              headers: corsHeaders,
            });
          }

          const gateway = createNexoraAiProvider(key);
          const model = gateway(NEXORA_DEFAULT_CHAT_MODEL);

          const ctx: ToolContext = {
            scope: "client",
            threadId: thread.id,
            actor: { userId: null, email: null, label: body.sessionId ?? "Visiteur web" },
          };

          const system = await buildClientSystemPrompt();
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(body.messages),
            tools: buildClientTools(ctx),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages,
            headers: corsHeaders,
            onFinish: async ({ messages }) => {
              try {
                const textOf = (m: any) => (m?.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
                // Find the last user message and (optionally) the last assistant message
                // with non-empty text. Persist whatever is present so tool-only turns
                // still record the user's message.
                let lastUserMsg: any = null;
                let lastAssistantWithText: any = null;
                for (let i = messages.length - 1; i >= 0; i--) {
                  const m: any = messages[i];
                  if (!lastAssistantWithText && m.role === "assistant" && textOf(m).trim()) {
                    lastAssistantWithText = m;
                  }
                  if (!lastUserMsg && m.role === "user") {
                    lastUserMsg = m;
                  }
                  if (lastUserMsg && lastAssistantWithText) break;
                }
                if (lastUserMsg || lastAssistantWithText) {
                  await persistVisitorTurn({
                    threadId: thread.id,
                    userParts: lastUserMsg?.parts,
                    userText: lastUserMsg ? textOf(lastUserMsg) : undefined,
                    assistantParts: lastAssistantWithText?.parts,
                    assistantText: lastAssistantWithText ? textOf(lastAssistantWithText) : undefined,
                  });
                }
              } catch (e) { console.warn("[visitor chat] persist failed:", e); }
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(msg, { status: 500, headers: corsHeaders });
        }
      },
    },
  },
});