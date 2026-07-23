// Public streaming chat endpoint for the floating Nexora Assistant widget.
// No auth: available to any site visitor. Uses Lovable AI Gateway.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createNexoraAiProvider, NEXORA_DEFAULT_CHAT_MODEL } from "@/lib/ai-chat/gateway.server";
import { buildClientSystemPrompt } from "@/lib/ai-chat/system-prompts.server";
import { buildClientTools, type ToolContext } from "@/lib/ai-chat/tools.server";

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
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500, headers: corsHeaders });

          const gateway = createNexoraAiProvider(key);
          const model = gateway(NEXORA_DEFAULT_CHAT_MODEL);

          const ctx: ToolContext = {
            scope: "client",
            threadId: null,
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
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(msg, { status: 500, headers: corsHeaders });
        }
      },
    },
  },
});