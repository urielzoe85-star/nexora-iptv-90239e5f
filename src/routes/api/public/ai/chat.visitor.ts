// Public streaming chat endpoint for the floating Nexora Assistant widget.
// No auth: available to any site visitor. Uses Lovable AI Gateway.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
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
            // Empty UI-message stream so the SDK closes cleanly on the client.
            const empty = streamText({
              model: createNexoraAiProvider(key)(NEXORA_DEFAULT_CHAT_MODEL),
              system: "Return an empty response.",
              messages: [{ role: "user", content: "" } as any],
              maxOutputTokens: 1,
            });
            return empty.toUIMessageStreamResponse({ originalMessages: body.messages, headers: corsHeaders });
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
                const last = messages[messages.length - 1];
                const prev = messages[messages.length - 2];
                const textOf = (m: any) => (m?.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
                if (prev?.role === "user" && last?.role === "assistant") {
                  await persistVisitorTurn({
                    threadId: thread.id,
                    userParts: prev.parts, userText: textOf(prev),
                    assistantParts: last.parts, assistantText: textOf(last),
                  });
                } else if (last?.role === "user") {
                  await persistVisitorTurn({
                    threadId: thread.id,
                    userParts: last.parts, userText: textOf(last),
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