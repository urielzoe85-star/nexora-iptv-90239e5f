// Téléchargement signé d'une playlist M3U ou Enigma.
// Le token contient l'iptv_account_id + expiration + HMAC. Un client
// qui ouvre le lien reçu par email est redirigé vers le M3U/Enigma
// (302). Aucun credential n'apparaît dans l'URL email.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/iptv/playlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("t") ?? "";
        const kind = (url.searchParams.get("k") ?? "m3u") as "m3u" | "enigma";
        const { verifyPlaylistToken, buildM3uUrl, buildEnigmaUrl } = await import("@/lib/iptv-delivery.builder");
        const parsed = await verifyPlaylistToken(token);
        if (!parsed) return new Response("Invalid or expired token", { status: 403 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: acc } = await supabaseAdmin
          .from("iptv_accounts")
          .select("username, password, dns_link, metadata, status")
          .eq("id", parsed.accountId)
          .maybeSingle<{ username: string; password: string | null; dns_link: string | null; metadata: any; status: string }>();
        if (!acc) return new Response("Not found", { status: 404 });

        const dns = acc.dns_link ?? (acc.metadata as any)?.dns_link ?? null;
        const target = kind === "enigma"
          ? buildEnigmaUrl({ dns, username: acc.username, password: acc.password })
          : buildM3uUrl({ dns, username: acc.username, password: acc.password });
        if (!target) return new Response("Playlist unavailable", { status: 404 });
        return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
      },
    },
  },
});