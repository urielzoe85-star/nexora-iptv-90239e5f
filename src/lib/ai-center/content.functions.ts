import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { callLovableAIJson, loadKnowledgeContext, logAiAction } from "./ai-provider.server";

const Format = z.enum(["tutorial", "guide", "comparison", "news", "smart_home"]);
const Length = z.enum(["short", "medium", "long"]);
const Locale = z.enum(["fr", "en"]);

interface DraftOutput {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  faq: { q: string; a: string }[];
  keywords: string[];
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export const generateBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      topic: z.string().min(3).max(200),
      primaryKeyword: z.string().min(2).max(120),
      secondaryKeywords: z.array(z.string().max(80)).max(10).default([]),
      format: Format.default("guide"),
      length: Length.default("medium"),
      locale: Locale.default("fr"),
      ctaTarget: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const kb = await loadKnowledgeContext();
    const lengthHint = data.length === "short" ? "700-900 mots" : data.length === "long" ? "1600-2200 mots" : "1100-1400 mots";
    const langHint = data.locale === "en" ? "English" : "Francais";

    const { data: parsed, raw } = await callLovableAIJson<DraftOutput>(
      [
        { role: "system", content: `Tu es redacteur SEO senior pour Nexora IPTV. Redige en ${langHint}. JSON strict: {title, slug, excerpt (<=200 chars), metaTitle (<=60), metaDescription (<=160), contentHtml, faq:[{q,a}] 4-6, keywords:[]}. contentHtml: HTML valide avec <h2>, <h3>, <p>, <ul>, <ol>, <strong>. Longueur cible ${lengthHint}. Format ${data.format}. Integrer 3-5 liens internes vers /produits, /essai-gratuit, /blog, /espace-client, /reseller. CTA final vers "${data.ctaTarget ?? "/produits"}". Aucun contenu illegal - streaming premium, chaines internationales.` },
        { role: "user", content: `Marque et memoire:\n${kb}\n\nSujet: ${data.topic}\nMot-cle principal: ${data.primaryKeyword}\nMots-cles secondaires: ${data.secondaryKeywords.join(", ") || "(aucun)"}\nCTA cible: ${data.ctaTarget ?? "/produits"}\n\nGenere l'article complet.` },
      ],
      { model: "openai/gpt-5.4", temperature: 0.7, maxTokens: 6000 },
    );

    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    let slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
    const { data: exists } = await supabaseAdmin
      .from("blog_posts").select("id").eq("locale", data.locale).eq("slug", slug).maybeSingle();
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const faqJsonLd = parsed.faq?.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: parsed.faq.map((f) => ({
            "@type": "Question", name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

    const faqHtml = parsed.faq?.length
      ? `<section><h2>FAQ</h2>${parsed.faq.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join("")}</section>` +
        (faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : "")
      : "";

    const contentHtml = (parsed.contentHtml || "") + faqHtml;
    const wordCount = contentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 220));

    const { data: inserted, error } = await supabaseAdmin.from("blog_posts").insert({
      title: parsed.title,
      slug,
      locale: data.locale,
      excerpt: parsed.excerpt?.slice(0, 500) ?? null,
      content_html: contentHtml,
      content_json: {} as never,
      seo_title: parsed.metaTitle?.slice(0, 80) ?? parsed.title.slice(0, 80),
      seo_description: parsed.metaDescription?.slice(0, 200) ?? parsed.excerpt?.slice(0, 200) ?? null,
      status: "draft",
      author_id: context.userId,
      author_name: "NEXORA Intelligence",
      ai_generated: true,
      ai_prompt: JSON.stringify({ topic: data.topic, keyword: data.primaryKeyword, format: data.format }),
      reading_time_min: readingTime,
    }).select("id,slug").single();

    if (error) {
      await logAiAction({ actor: context.userId, kind: "content_draft", input: data, output: parsed, raw, error: error.message });
      throw new Error("Enregistrement brouillon impossible: " + error.message);
    }

    await logAiAction({ actor: context.userId, kind: "content_draft", input: data, output: { id: inserted.id, slug: inserted.slug, keywords: parsed.keywords }, raw });

    return { id: inserted.id, slug: inserted.slug, preview: parsed };
  });