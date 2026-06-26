import { createFileRoute, notFound } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SETTINGS_SECTIONS } from "@/lib/ncc/modules";
import { Sparkles, Wrench } from "lucide-react";

export const Route = createFileRoute("/ncc/settings/$section")({
  component: SettingsSectionPage,
  notFoundComponent: () => (
    <div className="text-sm text-muted-foreground">Section introuvable.</div>
  ),
});

function SettingsSectionPage() {
  const { section } = Route.useParams();
  const def = SETTINGS_SECTIONS.find((s) => s.id === section);
  if (!def) throw notFound();
  return (
    <Card className="border-dashed border-border/60 bg-card/40">
      <CardContent className="py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">{def.label}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          La configuration de la catégorie « {def.label} » sera disponible dans une prochaine phase.
        </p>
        <Badge variant="secondary" className="gap-1 mt-4"><Wrench className="h-3 w-3" /> En préparation</Badge>
      </CardContent>
    </Card>
  );
}
