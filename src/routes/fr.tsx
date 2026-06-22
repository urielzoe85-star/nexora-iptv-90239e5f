import { createFileRoute } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/fr")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Divertissement illimité. Un seul abonnement." },
      { name: "description", content: "IPTV premium avec des milliers de chaînes, films et séries en HD/FHD/4K. Activation instantanée, multi-appareils, support 24/7." },
      { property: "og:title", content: "Nexora IPTV — Streaming Premium" },
      { property: "og:description", content: "Des milliers de chaînes en direct et VOD. Accès instantané. Multi-appareils." },
      { property: "og:url", content: "https://nexora-iptv.com/fr" },
      { property: "og:locale", content: "fr_FR" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/fr" }],
  }),
  component: () => (
    <I18nProvider forced="fr">
      <NexoraLanding />
    </I18nProvider>
  ),
});