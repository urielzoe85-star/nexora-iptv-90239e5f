import { createFileRoute } from "@tanstack/react-router";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — English Edition" },
      { property: "og:title", content: "Nexora IPTV — English Edition" },
      { property: "og:url", content: "https://nexora-iptv.com/en" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/en" }],
  }),
  component: NexoraLanding,
});