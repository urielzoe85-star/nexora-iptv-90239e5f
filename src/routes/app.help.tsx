import { createFileRoute } from "@tanstack/react-router";
import { FAQ } from "@/components/app/AppData";
import { LifeBuoy, BookOpen, Download, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/app/help")({
  head: () => ({
    meta: [
      { title: "Centre d'aide — NEXORA" },
      { name: "description", content: "FAQ, tutoriels, guide d'installation et support NEXORA." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Centre d'aide — NEXORA" },
      { property: "og:description", content: "Ressources d'aide et support NEXORA." },
      { property: "og:url", content: "https://nexora-iptv.com/app/help" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/app/help" }],
  }),
  component: HelpPage,
});

function HelpPage() {
  const cards = [
    { Icon: HelpCircle, title: "FAQ", text: "Réponses aux questions les plus fréquentes." },
    { Icon: BookOpen, title: "Tutoriels", text: "Guides pas à pas pour bien démarrer." },
    { Icon: Download, title: "Guide d'installation", text: "Comment installer les applications recommandées." },
    { Icon: LifeBuoy, title: "Support", text: "Notre équipe est disponible pour vous aider." },
  ];
  return (
    <div className="pt-12 pb-16">
      <h1 className="text-[40px] sm:text-[56px] font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
        Centre d'aide
      </h1>
      <p className="mt-3 max-w-2xl text-[16px]" style={{ color: "#3a3a3c" }}>
        Trouvez rapidement les réponses à vos questions.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-3xl p-6" style={{ background: "#f5f5f7" }}>
            <Icon className="h-6 w-6" style={{ color: "#0b0b0f" }} />
            <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#3a3a3c" }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-16 text-[24px] font-semibold tracking-tight">Questions fréquentes</h2>
      <div className="mt-6 divide-y" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        {FAQ.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="cursor-pointer list-none flex items-center justify-between text-[16px] font-medium">
              {item.q}
              <span className="ml-4 text-[20px] font-light transition-transform group-open:rotate-45" style={{ color: "#8e8e93" }}>+</span>
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#3a3a3c" }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}