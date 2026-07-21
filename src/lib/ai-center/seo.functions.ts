import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { callLovableAIJson, loadKnowledgeContext, logAiAction } from "./ai-provider.server";

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string) {
  const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
  const d = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? null;
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).slice(0, 5);
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1])).slice(0, 15);
  return { title: t, description: d, h1, h2 };
}

interface AuditResult {
  score: number;
  issues: { severity: "high" | "medium" | "low"; message: string }[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  internalLinks: { anchor: string; target: string }[];
  summary: string;
}

export const runSeoAudit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    let html = "";
    try {
      const res = await fetch(data.url, { headers: { "User-Agent": "NexoraAICenter/1.0" } });
      html = await res.text();
    } catch (e) {
      throw new Error("Impossible de charger la page: " + ((e as Error)?.message ?? "erreur reseau"));
    }
    const meta = extractMeta(html);
    const body = stripTags(html).slice(0, 8000);
    const kb = await loadKnowledgeContext();

    const { data: parsed, raw } = await callLovableAIJson<AuditResult>(
      [
        { role: "system", content: "Tu es un expert SEO senior. JSON strict: {score:0-100, issues:[{severity,message}], metaTitle, metaDescription, keywords:[], internalLinks:[{anchor,target}], summary}. Francais. metaTitle <60 chars, metaDescription <160 chars. 3-6 issues max. 5-8 mots-cles. 3-5 liens internes suggeres vers /produits, /blog, /essai-gratuit, /reseller." },
        { role: "user", content: `Contexte marque:\n${kb}\n\nURL: ${data.url}\nTitre actuel: ${meta.title}\nDescription actuelle: ${meta.description}\nH1: ${meta.h1.join(" | ")}\nH2: ${meta.h2.join(" | ")}\n\nExtrait:\n${body}` },
      ],
      { model: "google/gemini-3.6-flash", temperature: 0.3 },
    );
    await logAiAction({ actor: context.userId, kind: "seo_audit", input: { url: data.url }, output: parsed, raw });

    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
      const rows = (parsed.keywords ?? []).slice(0, 6).map((kw) => ({
        target_kind: "route",
        target_id: new URL(data.url).pathname,
        keyword: kw,
        action: `Optimiser ${data.url} pour "${kw}"`,
        score: parsed.score,
        created_by: context.userId,
        meta: { source: "seo_audit" } as never,
      }));
      if (rows.length) await supabaseAdmin.from("ai_seo_suggestions").insert(rows);
    } catch (e) {
      console.warn("persist suggestions failed", e);
    }

    return { audit: parsed, meta };
  });

interface KeywordResearch {
  intent: "informational" | "commercial" | "transactional" | "navigational";
  difficulty: "low" | "medium" | "high";
  action: string;
  cluster: string[];
  contentAngle: string;
}

export const researchKeyword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ keyword: z.string().min(2).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const kb = await loadKnowledgeContext();
    const { data: parsed, raw } = await callLovableAIJson<KeywordResearch>(
      [
        { role: "system", content: "Tu es un stratege SEO pour Nexora IPTV. JSON strict: {intent, difficulty, action, cluster:[8-15 mots-cles relies], contentAngle}. Francais." },
        { role: "user", content: `Marque:\n${kb}\n\nMot-cle cible: "${data.keyword}"\nDonne l'analyse complete.` },
      ],
      { model: "google/gemini-3.6-flash", temperature: 0.4 },
    );
    await logAiAction({ actor: context.userId, kind: "seo_audit", input: { keyword: data.keyword }, output: parsed, raw });

    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
      await supabaseAdmin.from("ai_seo_suggestions").insert({
        target_kind: "keyword",
        target_id: data.keyword,
        keyword: data.keyword,
        intent: parsed.intent,
        difficulty: parsed.difficulty,
        action: parsed.action,
        score: parsed.difficulty === "low" ? 80 : parsed.difficulty === "medium" ? 55 : 35,
        created_by: context.userId,
        meta: { cluster: parsed.cluster, contentAngle: parsed.contentAngle } as never,
      });
    } catch (e) {
      console.warn("persist keyword suggestion failed", e);
    }

    return parsed;
  });