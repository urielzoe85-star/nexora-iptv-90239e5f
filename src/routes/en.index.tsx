import { createFileRoute } from "@tanstack/react-router";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV (English) — Premium Streaming Subscription" },
      { name: "description", content: "English edition: thousands of live TV channels, movies and series in HD, FHD and 4K. Instant setup on Smart TV, mobile, tablet and PC with 24/7 support." },
      { property: "og:title", content: "Nexora IPTV — English Edition" },
      { property: "og:description", content: "Live TV, movies and series in HD/4K. Instant English-language setup across every device." },
      { property: "og:url", content: "https://nexora-iptv.com/en" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
      { name: "twitter:image", content: "https://nexora-iptv.com/__l5e/assets-v1/a913768d-af44-4e4b-a0cd-79192a6fcc3c/nexora-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/en" }],
  }),
  component: NexoraLanding,
});