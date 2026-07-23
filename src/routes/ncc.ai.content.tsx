import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateBlogDraft,
  suggestBlogTopics,
  listBlogSuggestions,
  updateBlogSuggestionStatus,
  generateDraftsFromSuggestions,
} from "@/lib/ai-center/content.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, ExternalLink, Sparkles, Wand2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/ai/content")({
  component: ContentCreator,
});

function ContentCreator() {
  const fn = useServerFn(generateBlogDraft);
  const suggestFn = useServerFn(suggestBlogTopics);
  const listFn = useServerFn(listBlogSuggestions);
  const updateStatusFn = useServerFn(updateBlogSuggestionStatus);
  const batchFn = useServerFn(generateDraftsFromSuggestions);
  const qc = useQueryClient();
  const [theme, setTheme] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const suggestions = useQuery({
    queryKey: ["ai-blog-suggestions"],
    queryFn: () => listFn(),
    refetchInterval: 15000,
  });

  const suggest = useMutation({
    mutationFn: () => suggestFn({ data: { locale: "fr", theme: theme || undefined } }),
    onSuccess: () => {
      toast.success("3 sujets generes — a toi de choisir");
      setSelected({});
      qc.invalidateQueries({ queryKey: ["ai-blog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => updateStatusFn({ data: { id, status: "rejected" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-blog-suggestions"] }),
  });

  const batch = useMutation({
    mutationFn: () => batchFn({ data: { ids: Object.keys(selected).filter((k) => selected[k]) } }),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => x.postId).length;
      const ko = r.results.length - ok;
      toast.success(`${ok} brouillon(s) cree(s)${ko ? `, ${ko} echec(s)` : ""}`);
      setSelected({});
      qc.invalidateQueries({ queryKey: ["ai-blog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (suggestions.data ?? []).filter((s: any) => s.status === "pending");
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const [form, setForm] = useState({
    topic: "",
    primaryKeyword: "",
    secondaryKeywords: "",
    format: "guide" as "tutorial" | "guide" | "comparison" | "news" | "smart_home",
    length: "medium" as "short" | "medium" | "long",
    locale: "fr" as "fr" | "en",
    ctaTarget: "/produits",
  });

  const gen = useMutation({
    mutationFn: () =>
      fn({
        data: {
          ...form,
          secondaryKeywords: form.secondaryKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => toast.success("Brouillon enregistre dans le blog"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <NccPageHeader icon={FileText} title="Content Creator" description="Genere un article SEO complet, sauvegarde comme brouillon dans le blog." />

      {/* ─── AI Suggestions ─── */}
      <Card className="border-primary/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Suggestions automatiques
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">L'IA analyse ta marque et le SEO pour proposer 3 sujets prets a publier apres validation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="w-64"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Theme optionnel (ex: iptv 4k)"
            />
            <Button onClick={() => suggest.mutate()} disabled={suggest.isPending}>
              {suggest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generer 3 sujets
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!suggestions.isLoading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune suggestion en attente. Clique sur "Generer 3 sujets" pour lancer l'IA.</p>
          )}
          {pending.length > 0 && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {pending.slice(0, 6).map((s: any) => (
                  <div key={s.id} className={`rounded-lg border p-3 space-y-2 transition ${selected[s.id] ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={!!selected[s.id]}
                        onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [s.id]: !!v }))}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{s.topic}</div>
                        {s.angle && <div className="text-xs text-muted-foreground mt-1">{s.angle}</div>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{s.format}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{s.length}</Badge>
                      {typeof s.seo_score === "number" && <Badge className="text-[10px]">SEO {s.seo_score}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-semibold">Mot-cle:</span> {s.primary_keyword}
                      {s.secondary_keywords?.length ? <> · {s.secondary_keywords.slice(0, 3).join(", ")}</> : null}
                    </div>
                    {s.rationale && <p className="text-[11px] text-muted-foreground line-clamp-3">{s.rationale}</p>}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-muted-foreground">CTA: {s.cta_target}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => reject.mutate(s.id)}>
                        <X className="h-3 w-3 mr-1" /> Rejeter
                      </Button>
                    </div>
                    {s.error && <p className="text-[11px] text-destructive">{s.error}</p>}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  {selectedCount} sujet(s) selectionne(s). Les brouillons sont crees avec image OG + URL canonique et restent en <strong>Draft</strong> jusqu'a ton accord.
                </div>
                <Button size="sm" disabled={!selectedCount || batch.isPending} onClick={() => batch.mutate()}>
                  {batch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Generer {selectedCount || ""} brouillon(s)
                </Button>
              </div>
            </>
          )}

          {(suggestions.data ?? []).some((s: any) => s.status === "generated") && (
            <div className="pt-3 border-t">
              <div className="text-xs font-semibold mb-2">Recents brouillons IA</div>
              <div className="flex flex-wrap gap-2">
                {(suggestions.data ?? []).filter((s: any) => s.status === "generated" && s.post_id).slice(0, 6).map((s: any) => (
                  <Button key={s.id} asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link to="/ncc/blog/$id" params={{ id: s.post_id }}>
                      <ExternalLink className="h-3 w-3 mr-1" /> {s.topic.slice(0, 40)}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Brief editorial</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Sujet</Label>
              <Textarea rows={2} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Comment choisir un abonnement IPTV en 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mot-cle principal</Label>
                <Input value={form.primaryKeyword} onChange={(e) => setForm({ ...form, primaryKeyword: e.target.value })} placeholder="abonnement iptv" />
              </div>
              <div className="space-y-1">
                <Label>CTA cible</Label>
                <Input value={form.ctaTarget} onChange={(e) => setForm({ ...form, ctaTarget: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mots-cles secondaires (virgule)</Label>
              <Input value={form.secondaryKeywords} onChange={(e) => setForm({ ...form, secondaryKeywords: e.target.value })} placeholder="iptv 4k, iptv france, iptv smart tv" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as typeof form.format })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="tutorial">Tutoriel</SelectItem>
                    <SelectItem value="comparison">Comparatif</SelectItem>
                    <SelectItem value="news">Actualite</SelectItem>
                    <SelectItem value="smart_home">Smart Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Longueur</Label>
                <Select value={form.length} onValueChange={(v) => setForm({ ...form, length: v as typeof form.length })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Court</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Langue</Label>
                <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v as typeof form.locale })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Francais</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => gen.mutate()} disabled={gen.isPending || !form.topic || !form.primaryKeyword}>
              {gen.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Generer le brouillon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Apercu</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!gen.data && <p className="text-muted-foreground">L'apercu apparaitra ici apres generation.</p>}
            {gen.data && (
              <>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Titre</div>
                  <p className="font-medium">{gen.data.preview.title}</p>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Extrait</div>
                  <p>{gen.data.preview.excerpt}</p>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">SEO</div>
                  <p className="text-xs"><strong>Title:</strong> {gen.data.preview.metaTitle}</p>
                  <p className="text-xs"><strong>Description:</strong> {gen.data.preview.metaDescription}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/ncc/blog/$id" params={{ id: gen.data.id }}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir le brouillon
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}