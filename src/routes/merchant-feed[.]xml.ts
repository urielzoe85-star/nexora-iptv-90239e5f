import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://nexora-iptv.com";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/merchant-feed.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = request.headers.get("host") ?? "";
        if (host === "app.nexora-iptv.com" || host.endsWith(".app.nexora-iptv.com")) {
          return new Response("Not found", { status: 404 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
        );
        const { data } = await sb
          .from("gallery_items")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        const items = (data ?? []).filter((r) => r.price != null);

        const entries = items.map((it) => {
          const link = it.product_slug
            ? `${BASE_URL}/produits/${it.product_slug}`
            : it.plan_slug
              ? `${BASE_URL}/#pricing-${it.plan_slug}`
              : `${BASE_URL}/galerie`;
          const avail = it.availability === "in_stock" ? "in stock" : it.availability === "preorder" ? "preorder" : "out of stock";
          return [
            `    <item>`,
            `      <g:id>${esc(String(it.id))}</g:id>`,
            `      <g:title>${esc(it.title)}</g:title>`,
            `      <g:description>${esc(it.description ?? it.title)}</g:description>`,
            `      <g:link>${esc(link)}</g:link>`,
            `      <g:image_link>${esc(it.image_url)}</g:image_link>`,
            `      <g:availability>${avail}</g:availability>`,
            `      <g:price>${Number(it.price).toFixed(2)} ${esc(it.currency)}</g:price>`,
            `      <g:condition>new</g:condition>`,
            `      <g:brand>${esc(it.brand ?? "Nexora IPTV")}</g:brand>`,
            it.sku ? `      <g:mpn>${esc(it.sku)}</g:mpn>` : `      <g:identifier_exists>false</g:identifier_exists>`,
            `    </item>`,
          ].join("\n");
        }).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nexora IPTV — Merchant feed</title>
    <link>${BASE_URL}</link>
    <description>Product feed for Google Merchant Center</description>
${entries}
  </channel>
</rss>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
