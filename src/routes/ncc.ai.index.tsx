import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAiDashboard } from "@/lib/ai-center/dashboard.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Sparkles, RefreshCw, TrendingUp, FileText, Search, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ncc/ai/")({
  component: AiDashboard,
});

function AiDashboard() {
  const fn = useServerFn(getAiDashboard);
  const q = useQuery({ queryKey: ["ai-dashboard"], queryFn: () => fn(), staleTime: 60_000 });
  const kpi = q.data?.kpi;
  const insights = q.data?.insights ?? [];

  return (
    <div className="space-y-6">
      <NccPageHeader
        icon={Sparkles}
        title="NEXORA AI Center"
        description="NEXORA Intelligence - votre directeur marketing IA."
        action={
          <Button onClick={() => q.refetch()} disabled={q.isFetching} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />
            Rafraichir
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={TrendingUp} label="Score SEO" value={kpi?.seoScore != null ? `${kpi.seoScore}/100` : "-"} />
        <Kpi icon={FileText} label="Articles publies (30j)" value={String(kpi?.published30 ?? "-")} />
        <Kpi icon={FileText} label="Brouillons" value={String(kpi?.drafts ?? "-")} />
        <Kpi icon={Search} label="Suggestions ouvertes" value={String(kpi?.openSuggestions ?? "-")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Recommandations NEXORA Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading && <p className="text-sm text-muted-foreground">Analyse en cours...</p>}
          {q.isError && <p className="text-sm text-destructive">{(q.error as Error)?.message}</p>}
          {!q.isLoading && !insights.length && (
            <p className="text-sm text-muted-foreground">Aucune recommandation pour le moment.</p>
          )}
          {insights.map((i, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{i.title}</div>
                <Badge variant={i.priority === "high" ? "destructive" : i.priority === "medium" ? "default" : "secondary"}>
                  {i.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{i.detail}</p>
              <p className="text-xs"><strong>Action:</strong> {i.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <SoonCard title="Social Media Manager" desc="Publications, captions, hashtags, calendrier editorial multi-plateformes." />
        <SoonCard title="Competitor Intelligence" desc="Analyse comparative des concurrents et detection des opportunites." />
        <SoonCard title="Automation Center" desc="Publication programmee et rapports hebdomadaires par email." />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
          </div>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function SoonCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="opacity-70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className="text-[10px]">Bientot</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{desc}</CardContent>
    </Card>
  );
}