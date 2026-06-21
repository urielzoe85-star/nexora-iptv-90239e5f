import { createFileRoute } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/en")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Unlimited Entertainment. One Subscription." },
      { name: "description", content: "Premium IPTV with thousands of channels, movies & series in HD/FHD/4K. Instant activation, multi-device, 24/7 support." },
      { property: "og:title", content: "Nexora IPTV — Premium Streaming" },
      { property: "og:description", content: "Thousands of live channels & VOD. Instant access. Multi-device." },
      { property: "og:url", content: "/en" },
      { property: "og:locale", content: "en_US" },
    ],
    links: [{ rel: "canonical", href: "/en" }],
  }),
  component: () => (
    <I18nProvider forced="en">
      <NexoraLanding />
    </I18nProvider>
  ),
});