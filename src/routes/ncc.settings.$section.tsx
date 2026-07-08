import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSettingsSection } from "@/lib/ncc/settings-schema";
import { SettingsSectionForm } from "@/components/ncc/settings/SettingsSectionForm";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/ncc/settings/$section")({
  component: SettingsSectionPage,
  notFoundComponent: () => (
    <div className="text-sm text-muted-foreground">Section introuvable.</div>
  ),
});

function SettingsSectionPage() {
  const { section } = Route.useParams();
  const def = getSettingsSection(section);
  if (!def) throw notFound();
  const Icon = def.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{def.label}</h2>
          <p className="text-sm text-muted-foreground">{def.description}</p>
        </div>
      </div>

      {def.shortcut ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{def.shortcut.label}</CardTitle>
            <CardDescription>{def.shortcut.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link to={def.shortcut.to as any}>Ouvrir <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : def.cards ? (
        <SettingsSectionForm cards={def.cards} />
      ) : null}
    </div>
  );
}
