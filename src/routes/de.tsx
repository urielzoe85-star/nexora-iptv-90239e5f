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
      { property: "og:url", content: "/de" },
      { property: "og:locale", content: "de_DE" },
    ],
    links: [{ rel: "canonical", href: "/de" }],
  }),
  component: () => (
    <I18nProvider forced="de">
      <NexoraLanding />
    </I18nProvider>
  ),
});