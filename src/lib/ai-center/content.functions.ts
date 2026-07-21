import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { callLovableAIJson, loadKnowledgeContext, logAiAction } from "./ai-provider.server";

const Format = z.enum(["tutorial", "guide", "comparison", "news", "smart_home"]);
const Length = z.enum(["short", "medium", "long"]);
const Locale = z.enum(["fr", "en"]);
const ImageStyleEnum = z.enum(["photorealistic", "editorial", "3d_isometric", "minimal"]);

interface DraftOutput {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  faq: { q: string; a: string }[];
  keywords: string[];
  imagePrompts?: Array<{ slot: "cover" | "inline"; prompt: string; alt: string; placement?: string }>;
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
      generateImages: z.boolean().default(true),
      illustrationsCount: z.number().int().min(0).max(4).default(2),
      imageStyle: ImageStyleEnum.default("photorealistic"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const kb = await loadKnowledgeContext();
    const lengthHint = data.length === "short" ? "700-900 mots" : data.length === "long" ? "1600-2200 mots" : "1100-1400 mots";
    const langHint = data.locale === "en" ? "English" : "Francais";
    const wantImages = data.generateImages;
    const nIll = data.illustrationsCount;
    const imagesInstruction = wantImages
      ? ` Ajoute aussi un tableau "imagePrompts" avec ${1 + nIll} entrees: 1 slot "cover" (visuel principal editorial, prompt en anglais, alt en ${langHint}) et ${nIll} slot "inline" avec un champ placement du type "after-h2:INDEX" (INDEX = position du <h2> apres lequel inserer, 0 = premier h2). Chaque entree: {slot, prompt (anglais descriptif, sujet concret, ambiance, cadrage, pas de texte incruste), alt (${langHint}, 6-14 mots), placement (uniquement pour slot=inline)}. Prompts photo-realistes, professionnels, sans logos ni texte.`
      : "";

    const { data: parsed, raw } = await callLovableAIJson<DraftOutput>(
      [
        { role: "system", content: `Tu es redacteur SEO senior pour Nexora IPTV. Redige en ${langHint}. JSON strict: {title, slug, excerpt (<=200 chars), metaTitle (<=60), metaDescription (<=160), contentHtml, faq:[{q,a}] 4-6, keywords:[], imagePrompts:[]}. contentHtml: HTML valide avec <h2>, <h3>, <p>, <ul>, <ol>, <strong>. Longueur cible ${lengthHint}. Format ${data.format}. Integrer 3-5 liens internes vers /produits, /essai-gratuit, /blog, /espace-client, /reseller. CTA final vers "${data.ctaTarget ?? "/produits"}". Aucun contenu illegal - streaming premium, chaines internationales.${imagesInstruction}` },
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

    let contentHtml = (parsed.contentHtml || "") + faqHtml;

    // ─── Images premium ───
    let coverUrl: string | null = null;
    let coverAlt: string | null = null;
    const inlineImages: Array<{ url: string; alt: string; placement?: string }> = [];
    const imageLogs: Array<Record<string, unknown>> = [];

    if (wantImages && parsed.imagePrompts?.length) {
      const { generateNexoraImage, insertInlineImages } = await import("./image-gen.server");
      const items = parsed.imagePrompts.slice(0, 1 + nIll);
      const results = await Promise.allSettled(
        items.map((p) =>
          generateNexoraImage({
            prompt: p.prompt,
            style: data.imageStyle,
            slug,
            slot: p.slot === "cover" ? "cover" : "inline",
          }).then((r) => ({ ...r, alt: p.alt, slot: p.slot, placement: p.placement })),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          imageLogs.push({ ok: true, model: r.value.model, slot: r.value.slot, path: r.value.path });
          if (r.value.slot === "cover" && !coverUrl) {
            coverUrl = r.value.url;
            coverAlt = r.value.alt;
          } else {
            inlineImages.push({ url: r.value.url, alt: r.value.alt, placement: r.value.placement });
          }
        } else {
          imageLogs.push({ ok: false, error: (r.reason as Error)?.message ?? "unknown" });
        }
      }
      if (inlineImages.length) contentHtml = insertInlineImages(contentHtml, inlineImages);
    }

    const wordCount = contentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 220));

    const { data: inserted, error } = await supabaseAdmin.from("blog_posts").insert({
      title: parsed.title,
      slug,
      locale: data.locale,
      excerpt: parsed.excerpt?.slice(0, 500) ?? null,
      content_html: contentHtml,
      content_json: {} as never,
      cover_image_url: coverUrl,
      cover_image_alt: coverAlt,
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

    await logAiAction({ actor: context.userId, kind: "content_draft", input: data, output: { id: inserted.id, slug: inserted.slug, keywords: parsed.keywords, images: imageLogs }, raw });

    return {
      id: inserted.id,
      slug: inserted.slug,
      preview: parsed,
      images: { cover: coverUrl, coverAlt, inline: inlineImages, log: imageLogs },
    };
  });