import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://nexora-iptv.com";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        let items = "";
        let lastBuild = new Date().toUTCString();
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data } = await sb
            .from("blog_posts")
            .select("slug,title,excerpt,published_at,updated_at,cover_image_url,author_name")
            .eq("status", "published")
            .eq("noindex", false)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false })
            .limit(50);
          const rows = (data ?? []) as Array<{
            slug: string; title: string; excerpt: string | null;
            published_at: string | null; updated_at: string | null;
            cover_image_url: string | null; author_name: string | null;
          }>;
          if (rows[0]?.published_at) lastBuild = new Date(rows[0].published_at).toUTCString();
          items = rows
            .map((p) => {
              const link = `${BASE_URL}/blog/${p.slug}`;
              const pubDate = new Date(p.published_at ?? p.updated_at ?? Date.now()).toUTCString();
              const enclosure = p.cover_image_url
                ? `      <enclosure url="${esc(p.cover_image_url)}" type="image/jpeg" />`
                : "";
              return [
                "    <item>",
                `      <title>${esc(p.title)}</title>`,
                `      <link>${link}</link>`,
                `      <guid isPermaLink="true">${link}</guid>`,
                `      <pubDate>${pubDate}</pubDate>`,
                p.author_name ? `      <dc:creator>${esc(p.author_name)}</dc:creator>` : "",
                p.excerpt ? `      <description>${esc(p.excerpt)}</description>` : "",
                enclosure,
                "    </item>",
              ].filter(Boolean).join("\n");
            })
            .join("\n");
        } catch {
          /* keep empty feed on failure */
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Blog Nexora IPTV</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Guides, tutoriels et actualités IPTV — Nexora.</description>
    <language>fr-FR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300, must-revalidate",
          },
        });
      },
    },
  },
});