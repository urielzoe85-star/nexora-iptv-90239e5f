import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Layers, ShieldCheck } from "lucide-react";
import { StoreBadge } from "@/components/app/StoreBadge";
import { RECOMMENDED_APPS, DEVICES } from "@/components/app/AppData";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "NEXORA Smart Services" },
      {
        name: "description",
        content:
          "Découvrez des applications officielles, des ressources utiles et des solutions numériques compatibles avec vos appareils.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "NEXORA Smart Services" },
      {
        property: "og:description",
        content: "Plateforme technologique pour découvrir des applications officielles et des ressources compatibles.",
      },
      { property: "og:url", content: "https://nexora-iptv.com/app" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/app" }],
  }),
  component: AppHome,
});

function AppHome() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-16 sm:pt-24 pb-16 text-center">
        <p className="text-[12px] uppercase tracking-[0.3em]" style={{ color: "#8e8e93" }}>
          Smart Services
        </p>
        <h1
          className="mt-4 font-semibold tracking-tight"
          style={{ fontSize: "clamp(48px, 9vw, 96px)", lineHeight: 1, letterSpacing: "-0.04em", color: "#0b0b0f" }}
        >
          NEXORA
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl text-[17px] sm:text-[19px] leading-relaxed"
          style={{ color: "#3a3a3c" }}
        >
          Découvrez des applications officielles, des ressources utiles et des solutions numériques
          compatibles avec vos appareils.
        </p>
        <div className="mt-8">
          <a
            href="#apps"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:-translate-y-0.5"
            style={{ background: "#0b0b0f", color: "#fff" }}
          >
            Découvrir <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Pourquoi Nexora */}
      <section className="py-16">
        <h2 className="text-center text-[28px] sm:text-[36px] font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Pourquoi Nexora ?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[15px]" style={{ color: "#6e6e73" }}>
          Une plateforme claire pour retrouver facilement des applications et ressources publiques.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { Icon: Compass, title: "Découvrir", text: "Explorez des applications officielles pertinentes pour vos appareils." },
            { Icon: Layers, title: "Comparer", text: "Consultez descriptions et compatibilités pour choisir en connaissance de cause." },
            { Icon: ShieldCheck, title: "Installer en confiance", text: "Les liens redirigent uniquement vers les boutiques officielles." },
          ].map(({ Icon, title, text }) => (
            <div
              key={title}
              className="rounded-3xl p-6"
              style={{ background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.04)" }}
            >
              <Icon className="h-6 w-6" style={{ color: "#0b0b0f" }} />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "#3a3a3c" }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Applications recommandées */}
      <section id="apps" className="py-16 scroll-mt-20">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Applications recommandées
            </h2>
            <p className="mt-2 text-[15px]" style={{ color: "#6e6e73" }}>
              Toutes disponibles sur les boutiques officielles.
            </p>
          </div>
          <Link to="/app/apps" className="text-[14px] font-medium hover:underline" style={{ color: "#0071e3" }}>
            Voir tout →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECOMMENDED_APPS.slice(0, 6).map((app) => (
            <article
              key={app.name}
              className="rounded-3xl p-6 flex flex-col"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              <h3 className="text-[19px] font-semibold tracking-tight">{app.name}</h3>
              <p className="mt-2 text-[14px] leading-relaxed flex-1" style={{ color: "#3a3a3c" }}>
                {app.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {app.stores.appstore && <StoreBadge store="appstore" href={app.stores.appstore} />}
                {app.stores.googleplay && <StoreBadge store="googleplay" href={app.stores.googleplay} />}
                {app.stores.microsoft && <StoreBadge store="microsoft" href={app.stores.microsoft} />}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Compatibilité */}
      <section className="py-16">
        <h2 className="text-center text-[28px] sm:text-[36px] font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Compatibilité
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[15px]" style={{ color: "#6e6e73" }}>
          Une expérience pensée pour vos appareils du quotidien.
        </p>
        <div className="mt-10 grid gap-3 grid-cols-3 sm:grid-cols-5">
          {DEVICES.map((d) => {
            const Icon = (Icons as any)[d.icon] ?? Icons.Monitor;
            return (
              <div
                key={d.name}
                className="rounded-2xl p-5 text-center"
                style={{ background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.04)" }}
              >
                <Icon className="mx-auto h-6 w-6" style={{ color: "#0b0b0f" }} />
                <div className="mt-3 text-[13px] font-medium">{d.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Centre d'aide */}
      <section className="py-16">
        <div
          className="rounded-3xl p-8 sm:p-12 text-center"
          style={{ background: "linear-gradient(180deg,#f5f5f7,#eef0f3)" }}
        >
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Centre d'aide
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: "#3a3a3c" }}>
            FAQ, tutoriels, guide d'installation et support pour vous accompagner.
          </p>
          <Link
            to="/app/help"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
            style={{ background: "#0b0b0f", color: "#fff" }}
          >
            Ouvrir le centre d'aide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* À propos + Mentions */}
      <section className="py-16 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl p-8" style={{ background: "#f5f5f7" }}>
          <h2 className="text-[24px] font-semibold tracking-tight">À propos</h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#3a3a3c" }}>
            Nexora est une plateforme technologique permettant de découvrir des applications et des
            ressources disponibles publiquement sur les boutiques officielles.
          </p>
        </div>
        <div className="rounded-3xl p-8" style={{ background: "#0b0b0f", color: "#f5f5f7" }}>
          <h2 className="text-[24px] font-semibold tracking-tight">Mentions</h2>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#c7c7cc" }}>
            Nexora ne fournit aucun contenu multimédia, aucune playlist, aucun identifiant, aucun fichier
            M3U, aucun code Xtream, aucun lecteur multimédia et aucun service de diffusion. Les
            téléchargements sont effectués exclusivement depuis les plateformes officielles des éditeurs.
          </p>
        </div>
      </section>
    </div>
  );
}