import { createFileRoute } from "@tanstack/react-router";
import { StoreBadge } from "@/components/app/StoreBadge";
import { RECOMMENDED_APPS } from "@/components/app/AppData";

export const Route = createFileRoute("/app/apps")({
  head: () => ({
    meta: [
      { title: "Applications recommandées — NEXORA" },
      { name: "description", content: "Liste des applications publiques recommandées, disponibles sur les boutiques officielles." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Applications recommandées — NEXORA" },
      { property: "og:description", content: "Applications publiques disponibles sur App Store, Google Play et Microsoft Store." },
      { property: "og:url", content: "https://nexora-iptv.com/app/apps" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/app/apps" }],
  }),
  component: AppsPage,
});

function AppsPage() {
  return (
    <div className="pt-12 pb-16">
      <h1 className="text-[40px] sm:text-[56px] font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
        Applications
      </h1>
      <p className="mt-3 max-w-2xl text-[16px]" style={{ color: "#3a3a3c" }}>
        Applications publiques recommandées. Toutes disponibles sur les boutiques officielles.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECOMMENDED_APPS.map((app) => (
          <article
            key={app.name}
            className="rounded-3xl p-6 flex flex-col"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-[19px] font-semibold tracking-tight">{app.name}</h2>
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
    </div>
  );
}