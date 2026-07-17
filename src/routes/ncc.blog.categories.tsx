import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListCategories, adminUpsertCategory, adminDeleteCategory } from "@/lib/blog.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FolderTree, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/blog/categories")({ component: CatPage });

function CatPage() {
  const list = useServerFn(adminListCategories);
  const upsert = useServerFn(adminUpsertCategory);
  const del = useServerFn(adminDeleteCategory);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ncc","blog","cats"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function save() {
    if (!name.trim()) return;
    try { await upsert({ data: { name: name.trim(), description: desc || null, sort_order: 0 } }); setName(""); setDesc(""); toast.success("Catégorie créée"); qc.invalidateQueries({ queryKey: ["ncc","blog","cats"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }
  async function remove(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try { await del({ data: { id } }); toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["ncc","blog","cats"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  return (
    <div>
      <NccPageHeader icon={FolderTree} title="Catégories" description="Organisation thématique du blog." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Nouvelle catégorie</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <Button onClick={save} className="w-full">Créer</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Catégories existantes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <ul className="divide-y">
                {(data ?? []).map((c: any) => (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">/{c.slug}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                ))}
                {(data ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucune catégorie.</li>}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}