import { createFileRoute } from "@tanstack/react-router";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/fr/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Divertissement illimité. Un seul abonnement." },
      { name: "description", content: "IPTV premium avec des milliers de chaînes, films et séries en HD/FHD/4K. Activation instantanée, multi-appareils, support 24/7." },
      { property: "og:title", content: "Nexora IPTV — Édition Française" },
      { property: "og:description", content: "Des milliers de chaînes en direct et VOD. Accès instantané. Multi-appareils." },
      { property: "og:url", content: "https://nexora-iptv.com/fr" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/fr" }],
  }),
  component: NexoraLanding,
});