import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://nexora-iptv.com";

const PAGES = ["/", "/fr", "/en", "/de", "/catalog", "/legal-guide", "/fr/guide-iptv", "/en/guide-iptv", "/blog/best-iptv-2026", "/track"];
const LOCALES: Record<string, string> = { fr: "fr", en: "en", de: "de" };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
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

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});