import { createFileRoute } from "@tanstack/react-router";
import { DEVICES } from "@/components/app/AppData";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/compatibility")({
  head: () => ({
    meta: [
      { title: "Compatibilité — NEXORA" },
      { name: "description", content: "Appareils compatibles : iPhone, iPad, Android, Android TV, Google TV, Apple TV, Windows, macOS, Smart TV." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Compatibilité — NEXORA" },
      { property: "og:description", content: "Compatible avec vos appareils du quotidien." },
      { property: "og:url", content: "https://nexora-iptv.com/app/compatibility" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/app/compatibility" }],
  }),
  component: CompatibilityPage,
});

function CompatibilityPage() {
  return (
    <div className="pt-12 pb-16">
      <h1 className="text-[40px] sm:text-[56px] font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
        Compatibilité
      </h1>
      <p className="mt-3 max-w-2xl text-[16px]" style={{ color: "#3a3a3c" }}>
        Une expérience pensée pour vos appareils du quotidien.
      </p>
      <div className="mt-10 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {DEVICES.map((d) => {
          const Icon = (Icons as any)[d.icon] ?? Icons.Monitor;
          return (
            <div
              key={d.name}
              className="rounded-2xl p-6 text-center"
              style={{ background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.04)" }}
            >
              <Icon className="mx-auto h-7 w-7" style={{ color: "#0b0b0f" }} />
              <div className="mt-3 text-[14px] font-medium">{d.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}