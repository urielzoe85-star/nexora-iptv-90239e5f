import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPlans, adminUpsertPlan, adminDeletePlan } from "@/lib/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/plans")({ component: PlansPage });

type PlanForm = {
  id?: string;
  slug: string; name: string; price: number; currency: string;
  period_label: string; save_label: string; popular: boolean;
  active: boolean; sort_order: number;
};
const empty: PlanForm = {
  slug: "", name: "", price: 0, currency: "USD",
  period_label: "/month", save_label: "", popular: false, active: true, sort_order: 0,
};

function PlansPage() {
  const list = useServerFn(adminListPlans);
  const upsert = useServerFn(adminUpsertPlan);
  const del = useServerFn(adminDeletePlan);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plans"], queryFn: () => list(),
  });

  async function save() {
    if (!editing) return;
    try {
      const { id, ...rest } = editing;
      await upsert({
        data: {
          id,
          data: {
            ...rest,
            price: Number(rest.price),
            sort_order: Number(rest.sort_order),
            save_label: rest.save_label.trim() || null,
          },
        },
      });
      toast.success("Plan enregistré");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await del({ data: { id: deleting.id } });
      toast.success("Plan supprimé");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plans & tarifs</h1>
          <p className="text-sm text-muted-foreground">Configurez les offres affichées sur le site.</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" />Nouveau plan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data || data.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Aucun plan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.sort_order}</TableCell>
                    <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                    <TableCell>
                      {p.name}{" "}
                      {p.popular && <Badge className="ml-2" variant="secondary">populaire</Badge>}
                    </TableCell>
                    <TableCell>${Number(p.price).toFixed(2)} {p.currency}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.period_label}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "outline"}>{p.active ? "actif" : "inactif"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="ghost" onClick={() => setEditing({
                        id: p.id, slug: p.slug, name: p.name, price: Number(p.price),
                        currency: p.currency, period_label: p.period_label,
                        save_label: p.save_label ?? "", popular: p.popular,
                        active: p.active, sort_order: p.sort_order,
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => setDeleting({ id: p.id, name: p.name })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Slug</Label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nom</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Prix</Label>
                <Input type="number" step="0.01" value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Devise</Label>
                <Input maxLength={3} value={editing.currency}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-1"><Label>Période</Label>
                <Input value={editing.period_label}
                  onChange={(e) => setEditing({ ...editing, period_label: e.target.value })} /></div>
              <div className="space-y-1"><Label>Économie</Label>
                <Input value={editing.save_label}
                  onChange={(e) => setEditing({ ...editing, save_label: e.target.value })} /></div>
              <div className="space-y-1"><Label>Ordre</Label>
                <Input type="number" value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between pt-6">
                <Label>Populaire</Label>
                <Switch checked={editing.popular} onCheckedChange={(v) => setEditing({ ...editing, popular: v })} />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Actif</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plan ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le plan <strong>{deleting?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}