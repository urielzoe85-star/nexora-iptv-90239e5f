import { createFileRoute } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/de")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Unbegrenztes Entertainment. Ein Abo." },
      { name: "description", content: "Premium-IPTV mit tausenden Sendern, Filmen und Serien in HD/FHD/4K. Sofortige Aktivierung, mehrere Geräte, 24/7-Support." },
      { property: "og:title", content: "Nexora IPTV — Premium-Streaming" },
      { property: "og:description", content: "Tausende Live-Sender und VOD. Sofortzugriff. Mehrere Geräte." },
      { property: "og:url", content: "https://nexora-iptv.com/de" },
      { property: "og:locale", content: "de_DE" },
      { property: "og:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
      { name: "twitter:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/de" }],
  }),
  component: () => (
    <I18nProvider forced="de">
      <NexoraLanding />
    </I18nProvider>
  ),
});