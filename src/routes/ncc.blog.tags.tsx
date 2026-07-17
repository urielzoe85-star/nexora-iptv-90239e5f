import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListTags, adminUpsertTag, adminDeleteTag } from "@/lib/blog.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tags, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/blog/tags")({ component: TagsPage });

function TagsPage() {
  const list = useServerFn(adminListTags);
  const upsert = useServerFn(adminUpsertTag);
  const del = useServerFn(adminDeleteTag);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ncc","blog","tags"], queryFn: () => list() });
  const [name, setName] = useState("");

  async function save() {
    if (!name.trim()) return;
    try { await upsert({ data: { name: name.trim() } }); setName(""); toast.success("Tag créé"); qc.invalidateQueries({ queryKey: ["ncc","blog","tags"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ce tag ?")) return;
    try { await del({ data: { id } }); toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["ncc","blog","tags"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  return (
    <div>
      <NccPageHeader icon={Tags} title="Tags" description="Mots-clés transverses des articles." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Nouveau tag</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} /></div>
            <Button onClick={save} className="w-full">Créer</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tags existants</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <ul className="divide-y">
                {(data ?? []).map((t: any) => (
                  <li key={t.id} className="py-2 flex items-center justify-between">
                    <div><span className="font-medium">{t.name}</span> <span className="text-xs text-muted-foreground ml-2">#{t.slug}</span></div>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                ))}
                {(data ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun tag.</li>}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}