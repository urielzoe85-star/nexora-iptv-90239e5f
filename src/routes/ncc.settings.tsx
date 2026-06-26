import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { SETTINGS_SECTIONS } from "@/lib/ncc/modules";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ncc/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <NccPageHeader icon={Settings} title="Paramètres" description="Configuration globale de la plateforme." />
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {SETTINGS_SECTIONS.map((s) => {
            const to = `/ncc/settings/${s.id}`;
            const active = path === to;
            return (
              <Link
                key={s.id}
                to="/ncc/settings/$section"
                params={{ section: s.id }}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm transition",
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
