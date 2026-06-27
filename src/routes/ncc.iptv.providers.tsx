import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Star, Trash2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ncc/ncc-ui";
import {
  listProviders, upsertProvider, deleteProvider, setDefaultProvider,
  toggleProviderStatus, checkProviderHealth,
} from "@/lib/iptv.functions";

export const Route = createFileRoute("/ncc/iptv/providers")({ component: ProvidersPage });

function ProvidersPage() {
  const list = useServerFn(listProviders);
  const up   = useServerFn(upsertProvider);
  const del  = useServerFn(deleteProvider);
  const setD = useServerFn(setDefaultProvider);
  const tog  = useServerFn(toggleProviderStatus);
  const hc   = useServerFn(checkProviderHealth);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({ queryKey: ["iptv", "providers"], queryFn: () => list() });
  const inv = () => qc.invalidateQueries({ queryKey: ["iptv"] });

  const mUp = useMutation({
    mutationFn: (v: any) => up({ data: v }),
    onSuccess: () => { toast.success("Fournisseur enregistré"); setOpen(false); inv(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("Supprimé"); inv(); } });
  const mDef = useMutation({ mutationFn: (id: string) => setD({ data: { id } }), onSuccess: () => { toast.success("Fournisseur par défaut"); inv(); } });
  const mTog = useMutation({ mutationFn: (v: { id: string; status: any }) => tog({ data: v }), onSuccess: () => inv() });
  const mHc  = useMutation({
    mutationFn: (id: string) => hc({ data: { id } }),
    onSuccess: (r) => toast.success(r.reachable ? "Provider OK" : "Pas d'API URL"),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau fournisseur</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Fournisseur IPTV</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mUp.mutate({
                name: String(f.get("name") ?? ""),
                api_url:  String(f.get("api_url")  ?? "") || null,
                panel_url:String(f.get("panel_url")?? "") || null,
                api_key:  String(f.get("api_key")  ?? "") || null,
                username: String(f.get("username") ?? "") || null,
                password: String(f.get("password") ?? "") || null,
                status: String(f.get("status") ?? "inactive"),
                is_default: f.get("is_default") === "on",
              });
            }}>
              <div><Label>Nom</Label><Input name="name" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>URL API</Label><Input name="api_url" placeholder="https://…" /></div>
                <div><Label>URL Panel</Label><Input name="panel_url" placeholder="https://…" /></div>
              </div>
              <div><Label>API Key</Label><Input name="api_key" type="password" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Username</Label><Input name="username" /></div>
                <div><Label>Password</Label><Input name="password" type="password" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <Label>Statut</Label>
                  <Select name="status" defaultValue="inactive">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="error">Erreur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_default" /> Par défaut
                </label>
              </div>
              <DialogFooter><Button type="submit" disabled={mUp.isPending}>Enregistrer</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nom</TableHead><TableHead>Statut</TableHead>
            <TableHead>Par défaut</TableHead><TableHead>API URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!q.isLoading && (q.data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Aucun fournisseur configuré.</TableCell></TableRow>}
            {(q.data ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>{p.is_default ? <Star className="h-4 w-4 text-amber-500" fill="currentColor" /> : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[260px]">{p.api_url ?? "—"}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => mHc.mutate(p.id)}><Activity className="h-3 w-3 mr-1" /> Test</Button>
                  {!p.is_default && <Button size="sm" variant="outline" onClick={() => mDef.mutate(p.id)}>Par défaut</Button>}
                  <Button size="sm" variant="outline" onClick={() => mTog.mutate({ id: p.id, status: p.status === "active" ? "inactive" : "active" })}>
                    {p.status === "active" ? "Désactiver" : "Activer"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) mDel.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}