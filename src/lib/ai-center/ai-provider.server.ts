// Lovable AI Gateway helper. Server-only. Reads LOVABLE_API_KEY inside the
// handler so it never leaks into client bundles.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export interface CallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export interface CallResult {
  text: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

export async function callLovableAI(messages: ChatMsg[], opts: CallOptions = {}): Promise<CallResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const model = opts.model ?? "google/gemini-3.6-flash";
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens) body.max_completion_tokens = opts.maxTokens;
  if (opts.responseFormatJson) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "nexora-ai-center",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Limite de requêtes IA atteinte, réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits IA Nexora épuisés — rechargez le workspace.");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";
  return {
    text,
    model,
    tokensIn: json.usage?.prompt_tokens,
    tokensOut: json.usage?.completion_tokens,
  };
}

export async function callLovableAIJson<T = unknown>(
  messages: ChatMsg[],
  opts: Omit<CallOptions, "responseFormatJson"> = {},
): Promise<{ data: T; raw: CallResult }> {
  const raw = await callLovableAI(messages, { ...opts, responseFormatJson: true });
  const cleaned = raw.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return { data: JSON.parse(cleaned) as T, raw };
  } catch {
    // Try to extract first JSON block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return { data: JSON.parse(match[0]) as T, raw };
    throw new Error("Réponse IA non JSON: " + cleaned.slice(0, 200));
  }
}

export async function logAiAction(params: {
  actor: string | null;
  kind: string;
  input: unknown;
  output?: unknown;
  raw?: CallResult;
  status?: string;
  error?: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await supabaseAdmin.from("ai_actions_log").insert({
      actor_user_id: params.actor,
      kind: params.kind,
      input: params.input as any,
      output: (params.output ?? null) as any,
      tokens_in: params.raw?.tokensIn ?? null,
      tokens_out: params.raw?.tokensOut ?? null,
      model: params.raw?.model ?? null,
      status: params.status ?? (params.error ? "error" : "ok"),
      error: params.error ?? null,
    });
  } catch (e) {
    console.warn("logAiAction failed", e);
  }
}

export async function loadKnowledgeContext(): Promise<string> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data } = await supabaseAdmin
    .from("ai_knowledge_base")
    .select("section,title,content")
    .order("section");
  if (!data?.length) return "";
  const parts = data.map((r: any) => `### [${r.section}] ${r.title}\n${r.content}`);
  return "# NEXORA KNOWLEDGE BASE\n\n" + parts.join("\n\n");
}