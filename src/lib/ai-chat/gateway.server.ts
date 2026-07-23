// Lovable AI Gateway provider for the Nexora AI Chat feature.
// Server-only. Reads LOVABLE_API_KEY inside the caller so it never leaks
// into client bundles.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createNexoraAiProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: false,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const NEXORA_DEFAULT_CHAT_MODEL = "google/gemini-3.6-flash";