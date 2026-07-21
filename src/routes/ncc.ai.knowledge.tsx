import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listKnowledge, upsertKnowledge, deleteKnowledge } from "@/lib/ai-center/knowledge.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/ai/knowledge")({
  component: Knowledge,
});

function Knowledge() {
  const listFn = useServerFn(listKnowledge);
  const saveFn = useServerFn(upsertKnowledge);
  const delFn = useServerFn(deleteKnowledge);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ai-kb"], queryFn: () => listFn() });
  const SECTIONS = ["brand", "products", "pricing", "tone", "faq", "guides"] as const;
  type Section = (typeof SECTIONS)[number];
  const [form, setForm] = useState<{ id: string; section: Section; title: string; content: string }>({ id: "", section: "brand", title: "", content: "" });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { section: form.section, title: form.title, content: form.content, id: form.id || undefined } }),
    onSuccess: () => {
      toast.success("Enregistre");
      setForm({ id: "", section: "brand", title: "", content: "" });
      qc.invalidateQueries({ queryKey: ["ai-kb"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-kb"] }),
  });

  return (
    <div className="space-y-6">
      <NccPageHeader icon={BookOpen} title="Knowledge Base" description="Memoire de marque : ces informations alimentent chaque prompt IA." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">{form.id ? "Modifier" : "Ajouter"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Section</Label>
              <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as Section })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Titre</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contenu</Label>
              <Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.content}>
                {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
              {form.id && (
                <Button variant="ghost" onClick={() => setForm({ id: "", section: "brand", title: "", content: "" })}>Annuler</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {q.isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {q.data?.rows.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm">{entry.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{entry.section}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setForm({ id: entry.id, section: entry.section as Section, title: entry.title, content: entry.content })}>Editer</Button>
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{entry.content}</CardContent>
            </Card>
          ))}
          {q.data && !q.data.rows.length && <p className="text-sm text-muted-foreground">Aucune entree.</p>}
        </div>
      </div>
    </div>
  );
}