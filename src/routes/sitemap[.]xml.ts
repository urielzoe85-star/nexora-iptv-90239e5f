import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://nexora-iptv.com";

// Public, indexable routes only. The following app routes are intentionally
// EXCLUDED from the sitemap (and should stay excluded):
//   - /checkout, /dashboard          → transactional / authenticated, no SEO value
//   - /unsubscribe                   → one-shot token endpoint, not shareable
//   - /admin, /admin/*, /ncc, /ncc/* → private backoffice (noindex,nofollow)
//   - /payment/success, /payment/failed → post-payment redirects
//   - /api/*, /lovable/*, /email/*   → server endpoints, not pages
const PAGES = [
  "/", "/fr", "/en", "/de",
  "/catalog", "/galerie", "/legal-guide",
  "/fr/guide-iptv", "/en/guide-iptv",
  "/blog", "/blog/best-iptv-2026", "/track",
  "/reseller",
  "/essai-gratuit",
  "/en/reseller",
  "/en/free-trial",
  // Sprint 3 · Bloc C — public compliance pages
  "/legal/terms", "/legal/sales", "/legal/privacy",
  "/legal/refund", "/legal/notice",
];
const LOCALES: Record<string, string> = { fr: "fr", en: "en", de: "de" };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Fetch published blog posts + categories via server publishable client.
        let blogUrls: { loc: string; lastmod?: string }[] = [];
        let productUrls: { loc: string; lastmod?: string }[] = [];
        let cacheStamp = new Date().toISOString();
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const url = process.env.SUPABASE_URL!;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
          const [posts, cats, products, stamp] = await Promise.all([
            sb.from("blog_posts").select("slug, updated_at").eq("status", "published").eq("noindex", false),
            sb.from("blog_categories").select("slug").eq("is_active", true),
            sb.from("gallery_items").select("product_slug, updated_at").eq("active", true).not("product_slug", "is", null),
            sb.from("sitemap_cache_state").select("updated_at").eq("id", 1).maybeSingle(),
          ]);
          for (const p of (posts.data ?? []) as any[]) blogUrls.push({ loc: `${BASE_URL}/blog/${p.slug}`, lastmod: p.updated_at });
          for (const c of (cats.data ?? []) as any[]) blogUrls.push({ loc: `${BASE_URL}/blog/categorie/${c.slug}` });
          for (const pr of (products.data ?? []) as any[]) {
            if (pr.product_slug) productUrls.push({ loc: `${BASE_URL}/produits/${pr.product_slug}`, lastmod: pr.updated_at });
          }
          if ((stamp as any)?.data?.updated_at) cacheStamp = (stamp as any).data.updated_at as string;
        } catch { /* ignore, keep static pages */ }

        const urls = PAGES.map((p) => {
          const alternates = Object.entries(LOCALES)
            .map(([code, path]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${BASE_URL}/${path}" />`)
            .join("\n");
          const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`;
          return [
            `  <url>`,
            `    <loc>${BASE_URL}${p}</loc>`,
            `    <changefreq>weekly</changefreq>`,
            `    <priority>${p === "/" ? "1.0" : "0.9"}</priority>`,
            alternates,
            xdefault,
            `  </url>`,
          ].join("\n");
        }).join("\n");

        const blogXml = blogUrls.map((u) => [
          `  <url>`,
          `    <loc>${u.loc}</loc>`,
          u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
          `    <changefreq>weekly</changefreq>`,
          `    <priority>0.7</priority>`,
          `  </url>`,
        ].filter(Boolean).join("\n")).join("\n");

        const productXml = productUrls.map((u) => [
          `  <url>`,
          `    <loc>${u.loc}</loc>`,
          u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
          `    <changefreq>weekly</changefreq>`,
          `    <priority>0.8</priority>`,
          `  </url>`,
        ].filter(Boolean).join("\n")).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
${blogXml}
${productXml}
</urlset>`;

        const etag = `W/"sm-${Buffer.from(cacheStamp).toString("base64")}"`;
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
        }
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
            "ETag": etag,
            "Last-Modified": new Date(cacheStamp).toUTCString(),
          },
        });
      },
    },
  },
});