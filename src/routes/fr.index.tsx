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
      { property: "og:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
      { name: "twitter:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/fr" }],
  }),
  component: NexoraLanding,
});