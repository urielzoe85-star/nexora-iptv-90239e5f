// Nexora AI image generation — server only. Calls Lovable AI Gateway image
// endpoint, uploads the PNG to blog-media, returns a long-lived signed URL.

const IMAGES_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

export type ImageStyle = "photorealistic" | "editorial" | "3d_isometric" | "minimal";

const STYLE_HINTS: Record<ImageStyle, string> = {
  photorealistic:
    "ultra photo-realistic, cinematic lighting, shallow depth of field, natural colors, premium editorial photography, 35mm lens",
  editorial:
    "modern editorial illustration, elegant composition, refined details, magazine-quality visual",
  "3d_isometric":
    "clean 3D isometric illustration, soft studio lighting, subtle gradients, premium tech aesthetic",
  minimal:
    "minimalist abstract composition, generous negative space, soft light, calm and premium",
};

const BRAND_HINT =
  "Nexora brand aesthetic: deep navy blue #0B1B3B and metallic gold #C9A227 accents, sleek premium tech mood, high quality, no text, no logos, no watermarks, no visible UI, no captions, no letters";

export function buildImagePrompt(userPrompt: string, style: ImageStyle = "photorealistic"): string {
  return `${userPrompt.trim()}. ${STYLE_HINTS[style]}. ${BRAND_HINT}.`;
}

interface GenResult {
  b64: string;
  model: string;
}

async function callImageModel(prompt: string, model: string): Promise<GenResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");

  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
    stream: false,
  };

  const res = await fetch(IMAGES_URL, {
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
    if (res.status === 429) throw new Error("Limite de requêtes IA image atteinte.");
    if (res.status === 402) throw new Error("Crédits IA Nexora épuisés.");
    throw new Error(`Image gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Réponse image vide");
  return { b64, model };
}

export async function generateNexoraImage(params: {
  prompt: string;
  style?: ImageStyle;
  slug?: string;
  slot?: "cover" | "inline" | "custom";
}): Promise<{ url: string; path: string; model: string; prompt: string }> {
  const style = params.style ?? "photorealistic";
  const fullPrompt = buildImagePrompt(params.prompt, style);

  let gen: GenResult;
  try {
    gen = await callImageModel(fullPrompt, "google/gemini-3-pro-image");
  } catch (e) {
    // Fallback on faster/cheaper Gemini image model.
    console.warn("[nexora-image] pro model failed, falling back:", (e as Error).message);
    gen = await callImageModel(fullPrompt, "google/gemini-3.1-flash-image");
  }

  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const buf = Buffer.from(gen.b64, "base64");
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10);
  const slugPart = (params.slug ?? params.slot ?? "img").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "img";
  const path = `ai/${year}/${slugPart}-${Date.now()}-${rand}.png`;

  const { error: upErr } = await supabaseAdmin.storage.from("blog-media").upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) throw new Error("Upload image échoué: " + upErr.message);

  const { data: signed, error: sErr } = await supabaseAdmin.storage
    .from("blog-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (sErr || !signed) throw new Error(sErr?.message ?? "Signed URL failed");

  return { url: signed.signedUrl, path, model: gen.model, prompt: fullPrompt };
}

// Insert <figure> illustrations into HTML content after specific <h2> anchors.
// placement examples: "after-h2:0", "after-h2:1", "top", "bottom".
export function insertInlineImages(
  html: string,
  imgs: Array<{ url: string; alt: string; placement?: string }>,
): string {
  if (!imgs.length) return html;
  let out = html;
  const bottomBucket: string[] = [];
  const topBucket: string[] = [];
  const h2Buckets = new Map<number, string[]>();

  for (const img of imgs) {
    const fig = `\n<figure class="my-6"><img src="${img.url}" alt="${(img.alt || "").replace(/"/g, "&quot;")}" loading="lazy" width="1280" height="720" class="w-full rounded-lg" />${img.alt ? `<figcaption class="text-sm text-muted-foreground mt-2 text-center">${img.alt}</figcaption>` : ""}</figure>\n`;
    const p = (img.placement ?? "").toLowerCase();
    const m = p.match(/^after-h2:(\d+)$/);
    if (m) {
      const idx = Number(m[1]);
      const arr = h2Buckets.get(idx) ?? [];
      arr.push(fig);
      h2Buckets.set(idx, arr);
    } else if (p === "top") topBucket.push(fig);
    else bottomBucket.push(fig);
  }

  if (h2Buckets.size) {
    let counter = 0;
    out = out.replace(/<\/h2>/gi, (match) => {
      const arr = h2Buckets.get(counter);
      counter += 1;
      return arr && arr.length ? match + arr.join("") : match;
    });
  }
  if (topBucket.length) out = topBucket.join("") + out;
  if (bottomBucket.length) out = out + bottomBucket.join("");
  return out;
}