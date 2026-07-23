import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { callLovableAIJson, loadKnowledgeContext, logAiAction } from "./ai-provider.server";

const Format = z.enum(["tutorial", "guide", "comparison", "news", "smart_home"]);
const Length = z.enum(["short", "medium", "long"]);
const Locale = z.enum(["fr", "en"]);

const SITE_URL = "https://nexora-iptv.com";

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

// ─────────── OG image generator (Lovable AI Gateway) ───────────
async function generateOgImagePng(prompt: string): Promise<Buffer | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json: { data?: Array<{ b64_json?: string }> } = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

async function uploadOgImage(slug: string, buf: Buffer): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const path = `og/${slug}-${Date.now().toString(36)}.png`;
    const { error } = await supabaseAdmin.storage.from("blog-media").upload(path, buf, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) return null;
    const { data: signed } = await supabaseAdmin.storage
      .from("blog-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    return signed?.signedUrl ?? null;
  } catch {
    return null;
  }
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

    // OG image (best-effort — draft still saves if image fails)
    const ogPrompt = `Wide 1200x630 social share cover image, editorial minimal style, deep navy blue background (#0B1B3B) with metallic gold accents, subtle abstract streaming waves and geometric TV/screen motif, no text at all, premium tech brand feel for article: "${parsed.title}".`;
    const ogBuf = await generateOgImagePng(ogPrompt);
    const ogUrl = ogBuf ? await uploadOgImage(slug, ogBuf) : null;
    const canonicalUrl = `${SITE_URL}/blog/${slug}`;

    const { data: inserted, error } = await supabaseAdmin.from("blog_posts").insert({
      title: parsed.title,
      slug,
      locale: data.locale,
      excerpt: parsed.excerpt?.slice(0, 500) ?? null,
      content_html: contentHtml,
      content_json: {} as never,
      seo_title: parsed.metaTitle?.slice(0, 80) ?? parsed.title.slice(0, 80),
      seo_description: parsed.metaDescription?.slice(0, 200) ?? parsed.excerpt?.slice(0, 200) ?? null,
      canonical_url: canonicalUrl,
      og_image_url: ogUrl,
      cover_image_url: ogUrl,
      cover_image_alt: parsed.title,
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

    await logAiAction({ actor: context.userId, kind: "content_draft", input: data, output: { id: inserted.id, slug: inserted.slug, keywords: parsed.keywords, ogUrl }, raw });

    return { id: inserted.id, slug: inserted.slug, preview: parsed, ogUrl, canonicalUrl };
  });

// ─────────── Suggest 3 topics ───────────
interface TopicSuggestion {
  topic: string;
  angle: string;
  format: "tutorial" | "guide" | "comparison" | "news" | "smart_home";
  length: "short" | "medium" | "long";
  locale: "fr" | "en";
  primary_keyword: string;
  secondary_keywords: string[];
  cta_target: string;
  seo_score: number;
  rationale: string;
}

export const suggestBlogTopics = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      locale: Locale.default("fr"),
      theme: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const kb = await loadKnowledgeContext();

    // Fetch existing blog titles to avoid duplicates
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: existing } = await supabaseAdmin
      .from("blog_posts")
      .select("title,slug,seo_title")
      .eq("locale", data.locale)
      .order("created_at", { ascending: false })
      .limit(50);
    const existingList = (existing ?? []).map((p: any) => `- ${p.title} (/blog/${p.slug})`).join("\n") || "(aucun)";

    const langHint = data.locale === "en" ? "English" : "Francais";
    const themeHint = data.theme?.trim() || "IPTV premium, streaming, smart TV, actualites tech grand public";

    const { data: parsed, raw } = await callLovableAIJson<{ topics: TopicSuggestion[] }>(
      [
        {
          role: "system",
          content: `Tu es strategiste SEO senior pour Nexora IPTV (https://nexora-iptv.com). Ton objectif: proposer 3 sujets de blog DIFFERENTS et complementaires qui vont booster le SEO et convertir en clients. Redige en ${langHint}. Sortie JSON strict: {"topics":[{topic, angle, format (guide|tutorial|comparison|news|smart_home), length (short|medium|long), locale, primary_keyword, secondary_keywords[3-6], cta_target (chemin ex: /produits ou /pricing ou /reseller ou /essai-gratuit), seo_score (0-100, potentiel realiste), rationale (pourquoi ce sujet va performer)}]}. Regles: 3 sujets DIFFERENCIES (1 guide long informatif + 1 comparatif/decisionnel + 1 actualite ou tendance chaude); mots-cles a fort volume et intention transactionnelle ou informationnelle qualifiee; ne repete AUCUN sujet deja publie; privilegier des angles qui convertissent (choisir, comparer, installer, activer, resoudre, meilleur, 2026).`,
        },
        {
          role: "user",
          content: `Marque & memoire:\n${kb}\n\nTheme prioritaire: ${themeHint}\n\nArticles deja publies (a NE PAS repeter):\n${existingList}\n\nGenere 3 sujets prets a briefer.`,
        },
      ],
      { model: "openai/gpt-5.4", temperature: 0.9, maxTokens: 2500 },
    );

    const batchId = crypto.randomUUID();
    const rows = (parsed.topics ?? []).slice(0, 3).map((t) => ({
      batch_id: batchId,
      topic: String(t.topic).slice(0, 300),
      angle: t.angle ? String(t.angle).slice(0, 500) : null,
      format: (["tutorial", "guide", "comparison", "news", "smart_home"].includes(t.format) ? t.format : "guide") as string,
      length: (["short", "medium", "long"].includes(t.length) ? t.length : "medium") as string,
      locale: data.locale,
      primary_keyword: String(t.primary_keyword).slice(0, 120),
      secondary_keywords: Array.isArray(t.secondary_keywords) ? t.secondary_keywords.slice(0, 10).map((s) => String(s).slice(0, 80)) : [],
      cta_target: t.cta_target ? String(t.cta_target).slice(0, 200) : "/produits",
      seo_score: typeof t.seo_score === "number" ? Math.max(0, Math.min(100, Math.round(t.seo_score))) : null,
      rationale: t.rationale ? String(t.rationale).slice(0, 1000) : null,
      status: "pending",
      created_by: context.userId,
    }));

    if (!rows.length) throw new Error("L'IA n'a pas renvoye de sujets exploitables.");

    const { data: inserted, error } = await supabaseAdmin
      .from("ai_blog_suggestions")
      .insert(rows)
      .select("*");
    if (error) throw new Error("Enregistrement suggestions impossible: " + error.message);

    await logAiAction({
      actor: context.userId,
      kind: "content_suggest",
      input: data,
      output: { batchId, count: inserted?.length ?? 0 },
      raw,
    });

    return { batchId, suggestions: inserted ?? [] };
  });

// ─────────── List latest suggestions ───────────
export const listBlogSuggestions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin
      .from("ai_blog_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─────────── Reject / update suggestion ───────────
export const updateBlogSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "generated"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin
      .from("ai_blog_suggestions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────── Generate drafts for selected suggestions ───────────
export const generateDraftsFromSuggestions = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: rows, error } = await supabaseAdmin
      .from("ai_blog_suggestions")
      .select("*")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Aucune suggestion trouvee.");

    const results: Array<{ id: string; postId?: string; slug?: string; error?: string }> = [];

    for (const s of rows) {
      try {
        const kb = await loadKnowledgeContext();
        const lengthHint = s.length === "short" ? "700-900 mots" : s.length === "long" ? "1600-2200 mots" : "1100-1400 mots";
        const langHint = s.locale === "en" ? "English" : "Francais";

        const { data: parsed, raw } = await callLovableAIJson<DraftOutput>(
          [
            { role: "system", content: `Tu es redacteur SEO senior pour Nexora IPTV. Redige en ${langHint}. JSON strict: {title, slug, excerpt (<=200 chars), metaTitle (<=60), metaDescription (<=160), contentHtml, faq:[{q,a}] 4-6, keywords:[]}. contentHtml: HTML valide avec <h2>, <h3>, <p>, <ul>, <ol>, <strong>. Longueur cible ${lengthHint}. Format ${s.format}. Angle: ${s.angle ?? ""}. Integrer 3-5 liens internes vers /produits, /essai-gratuit, /blog, /espace-client, /reseller. CTA final vers "${s.cta_target ?? "/produits"}". Aucun contenu illegal - streaming premium, chaines internationales.` },
            { role: "user", content: `Marque et memoire:\n${kb}\n\nSujet: ${s.topic}\nMot-cle principal: ${s.primary_keyword}\nMots-cles secondaires: ${(s.secondary_keywords ?? []).join(", ") || "(aucun)"}\nCTA cible: ${s.cta_target ?? "/produits"}\n\nGenere l'article complet.` },
          ],
          { model: "openai/gpt-5.4", temperature: 0.7, maxTokens: 6000 },
        );

        let slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
        const { data: exists } = await supabaseAdmin
          .from("blog_posts").select("id").eq("locale", s.locale).eq("slug", slug).maybeSingle();
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

        const ogPrompt = `Wide 1200x630 social share cover image, editorial minimal style, deep navy blue background (#0B1B3B) with metallic gold accents, subtle abstract streaming waves and geometric TV/screen motif, no text at all, premium tech brand feel for article: "${parsed.title}".`;
        const ogBuf = await generateOgImagePng(ogPrompt);
        const ogUrl = ogBuf ? await uploadOgImage(slug, ogBuf) : null;
        const canonicalUrl = `${SITE_URL}/blog/${slug}`;

        const { data: inserted, error: insErr } = await supabaseAdmin.from("blog_posts").insert({
          title: parsed.title,
          slug,
          locale: s.locale,
          excerpt: parsed.excerpt?.slice(0, 500) ?? null,
          content_html: contentHtml,
          content_json: {} as never,
          seo_title: parsed.metaTitle?.slice(0, 80) ?? parsed.title.slice(0, 80),
          seo_description: parsed.metaDescription?.slice(0, 200) ?? parsed.excerpt?.slice(0, 200) ?? null,
          canonical_url: canonicalUrl,
          og_image_url: ogUrl,
          cover_image_url: ogUrl,
          cover_image_alt: parsed.title,
          status: "draft",
          author_id: context.userId,
          author_name: "NEXORA Intelligence",
          ai_generated: true,
          ai_prompt: JSON.stringify({ suggestionId: s.id, topic: s.topic, keyword: s.primary_keyword, format: s.format }),
          reading_time_min: readingTime,
        }).select("id,slug").single();

        if (insErr) throw new Error(insErr.message);

        await supabaseAdmin.from("ai_blog_suggestions")
          .update({ status: "generated", post_id: inserted.id, error: null })
          .eq("id", s.id);

        await logAiAction({
          actor: context.userId,
          kind: "content_batch_generate",
          input: { suggestionId: s.id },
          output: { postId: inserted.id, slug: inserted.slug, ogUrl },
          raw,
        });

        results.push({ id: s.id, postId: inserted.id, slug: inserted.slug });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin.from("ai_blog_suggestions")
          .update({ status: "pending", error: msg.slice(0, 500) })
          .eq("id", s.id);
        await logAiAction({ actor: context.userId, kind: "content_batch_generate", input: { suggestionId: s.id }, error: msg });
        results.push({ id: s.id, error: msg });
      }
    }

    return { results };
  });