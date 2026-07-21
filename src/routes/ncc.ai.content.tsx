import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { generateBlogDraft } from "@/lib/ai-center/content.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/ai/content")({
  component: ContentCreator,
});

function ContentCreator() {
  const fn = useServerFn(generateBlogDraft);
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