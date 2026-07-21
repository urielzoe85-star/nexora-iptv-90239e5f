import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { callLovableAIJson, loadKnowledgeContext, logAiAction } from "./ai-provider.server";

interface Insight {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  action: string;
}

export const getAiDashboard = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [{ count: published30 }, { count: drafts }, { count: openSug }, { data: recentPosts }] = await Promise.all([
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true })
        .eq("status", "published").gte("published_at", since),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabaseAdmin.from("ai_seo_suggestions").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("blog_posts").select("id,title,status,updated_at,view_count").order("updated_at", { ascending: false }).limit(10),
    ]);

    const { data: sugRows } = await supabaseAdmin
      .from("ai_seo_suggestions").select("score").eq("status", "open");
    const scores = (sugRows ?? []).map((r: { score: number | null }) => r.score).filter((v): v is number => typeof v === "number");
    const seoScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const kpi = {
      seoScore,
      published30: published30 ?? 0,
      drafts: drafts ?? 0,
      openSuggestions: openSug ?? 0,
    };

    let insights: Insight[] = [];
    try {
      const kb = await loadKnowledgeContext();
      const { data, raw } = await callLovableAIJson<{ insights: Insight[] }>(
        [
          { role: "system", content: "Tu es NEXORA Intelligence, directeur marketing IA. Réponds en JSON strict: {\"insights\":[{title,detail,priority:'high'|'medium'|'low',action}]} — 3 à 5 items concis en français, orientés croissance SEO et conversion pour Nexora IPTV." },
          { role: "user", content: `Contexte:\n${kb}\n\nKPI actuels:\n${JSON.stringify(kpi)}\nArticles récents:\n${JSON.stringify(recentPosts ?? [])}\n\nPropose 3 à 5 actions marketing prioritaires cette semaine.` },
        ],
        { model: "google/gemini-3.6-flash", temperature: 0.4 },
      );
      insights = Array.isArray(data?.insights) ? data.insights.slice(0, 5) : [];
      await logAiAction({ actor: context.userId, kind: "dashboard_insight", input: kpi, output: insights, raw });
    } catch (e) {
      await logAiAction({ actor: context.userId, kind: "dashboard_insight", input: kpi, error: (e as Error)?.message });
    }

    return { kpi, insights, generatedAt: new Date().toISOString() };
  });