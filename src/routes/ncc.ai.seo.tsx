import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { runSeoAudit, researchKeyword } from "@/lib/ai-center/seo.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/ai/seo")({
  component: SeoIntelligence,
});

function SeoIntelligence() {
  const auditFn = useServerFn(runSeoAudit);
  const kwFn = useServerFn(researchKeyword);
  const [url, setUrl] = useState("https://nexora-iptv.com/");
  const [kw, setKw] = useState("");

  const audit = useMutation({
    mutationFn: (u: string) => auditFn({ data: { url: u } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const research = useMutation({
    mutationFn: (k: string) => kwFn({ data: { keyword: k } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <NccPageHeader icon={Search} title="SEO Intelligence" description="Audit de pages et recherche de mots-cles pilotes par NEXORA Intelligence." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Audit d'une page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>URL a auditer</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://nexora-iptv.com/produits" />
            </div>
            <Button onClick={() => audit.mutate(url)} disabled={audit.isPending || !url}>
              {audit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Lancer l'audit
            </Button>
            {audit.data && (
              <div className="mt-3 rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Score SEO</div>
                  <Badge>{audit.data.audit.score}/100</Badge>
                </div>
                <p className="text-muted-foreground">{audit.data.audit.summary}</p>
                <div>
                  <div className="font-medium text-xs uppercase mt-2">Meta suggeree</div>
                  <p className="text-xs"><strong>Title:</strong> {audit.data.audit.metaTitle}</p>
                  <p className="text-xs"><strong>Description:</strong> {audit.data.audit.metaDescription}</p>
                </div>
                <div>
                  <div className="font-medium text-xs uppercase mt-2">Issues</div>
                  <ul className="space-y-1">
                    {audit.data.audit.issues?.map((i, idx) => (
                      <li key={idx} className="text-xs flex gap-2">
                        <Badge variant={i.severity === "high" ? "destructive" : i.severity === "medium" ? "default" : "secondary"} className="shrink-0">{i.severity}</Badge>
                        <span>{i.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-xs uppercase mt-2">Mots-cles</div>
                  <div className="flex flex-wrap gap-1">
                    {audit.data.audit.keywords?.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" />Recherche de mots-cles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Mot-cle cible</Label>
              <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="abonnement iptv premium" />
            </div>
            <Button onClick={() => research.mutate(kw)} disabled={research.isPending || !kw}>
              {research.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Analyser
            </Button>
            {research.data && (
              <div className="mt-3 rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline">Intent: {research.data.intent}</Badge>
                  <Badge variant={research.data.difficulty === "low" ? "secondary" : research.data.difficulty === "high" ? "destructive" : "default"}>Difficulte: {research.data.difficulty}</Badge>
                </div>
                <p><strong>Action:</strong> {research.data.action}</p>
                <p><strong>Angle:</strong> {research.data.contentAngle}</p>
                <div className="flex flex-wrap gap-1">
                  {research.data.cluster?.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}