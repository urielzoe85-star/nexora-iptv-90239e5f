import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /checkout
Disallow: /track
Disallow: /payment/
Disallow: /unsubscribe

Sitemap: https://nexora-iptv.com/sitemap.xml
`;

const APPSTORE_ROBOTS = `User-agent: *
Disallow: /
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = request.headers.get("host") ?? "";
        const body = host === "app.nexora-iptv.com" || host.endsWith(".app.nexora-iptv.com")
          ? APPSTORE_ROBOTS
          : DEFAULT_ROBOTS;
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});