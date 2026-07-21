import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/about")({
  head: () => ({
    meta: [
      { title: "À propos — NEXORA" },
      { name: "description", content: "Nexora est une plateforme technologique pour découvrir des applications et ressources publiques." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "À propos — NEXORA" },
      { property: "og:description", content: "Plateforme technologique pour découvrir des applications et des ressources publiques." },
      { property: "og:url", content: "https://nexora-iptv.com/app/about" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="pt-12 pb-16 max-w-3xl">
      <h1 className="text-[40px] sm:text-[56px] font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
        À propos
      </h1>
      <p className="mt-6 text-[17px] leading-relaxed" style={{ color: "#3a3a3c" }}>
        Nexora est une plateforme technologique permettant de découvrir des applications et des
        ressources disponibles publiquement sur les boutiques officielles.
      </p>

      <div className="mt-10 rounded-3xl p-8" style={{ background: "#0b0b0f", color: "#f5f5f7" }}>
        <h2 className="text-[22px] font-semibold tracking-tight">Mentions</h2>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#c7c7cc" }}>
          Nexora ne fournit aucun contenu multimédia, aucune playlist, aucun identifiant, aucun fichier
          M3U, aucun code Xtream, aucun lecteur multimédia et aucun service de diffusion. Les
          téléchargements sont effectués exclusivement depuis les plateformes officielles des éditeurs.
        </p>
      </div>
    </div>
  );
}