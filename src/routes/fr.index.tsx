import { createFileRoute } from "@tanstack/react-router";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/fr/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Édition Française" },
      { property: "og:title", content: "Nexora IPTV — Édition Française" },
      { property: "og:url", content: "https://nexora-iptv.com/fr" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/fr" }],
  }),
  component: NexoraLanding,
});