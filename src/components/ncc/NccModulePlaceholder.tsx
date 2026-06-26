import type { NccModule } from "@/lib/ncc/modules";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NccPageHeader } from "./NccPageHeader";
import { Sparkles, Wrench } from "lucide-react";

export function NccModulePlaceholder({ module: m }: { module: NccModule }) {
  return (
    <div>
      <NccPageHeader
        icon={m.icon}
        title={m.label}
        description={m.description}
        action={<Badge variant="secondary" className="gap-1"><Wrench className="h-3 w-3" /> En préparation</Badge>}
      />
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardContent className="py-12 text-center max-w-xl mx-auto">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">Module {m.label} bientôt disponible</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ce module fait partie de la feuille de route NEXORA. L'interface et les intégrations
            seront déployées dans une prochaine phase.
          </p>
          {m.upcoming && m.upcoming.length > 0 && (
            <div className="mt-6 text-left inline-block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fonctionnalités prévues</div>
              <ul className="space-y-1.5 text-sm">
                {m.upcoming.map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {u}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8">
            <Button disabled>Notifier au lancement</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
