import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Plus } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { listTrials, createTrial, setTrialStatus, listCustomers, listProducts } from "@/lib/ncc.functions";
import { fmtDate, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/trials")({ component: TrialsPage });

function TrialsPage() {
  const list = useServerFn(listTrials);
  const create = useServerFn(createTrial);
  const setStatus = useServerFn(setTrialStatus);
  const lc = useServerFn(listCustomers);
  const lp = useServerFn(listProducts);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["ncc", "trials"], queryFn: () => list() });
  const customers = useQuery({ queryKey: ["ncc", "customers", "for-pick"], queryFn: () => lc({ data: { page: 1, pageSize: 100, sort: "email", direction: "asc" } }) });
  const products = useQuery({ queryKey: ["ncc", "products", "for-pick"], queryFn: () => lp({ data: {} }) });

  const m = useMutation({
    mutationFn: (input: { customer_id: string; product_id?: string; expires_at?: string; notes?: string }) => create({ data: input }),
    onSuccess: () => { toast.success("Essai créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["ncc", "trials"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const r = useMutation({
    mutationFn: (id: string) => setStatus({ data: { id, status: "revoked" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncc", "trials"] }),
  });

  return (
    <div>
      <NccPageHeader
        icon={Gift} title="Essais gratuits" description="Création, attribution, expiration et historique."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvel essai</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel essai</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ex = String(f.get("expires_at") ?? "");
                m.mutate({
                  customer_id: String(f.get("customer_id") ?? ""),
                  product_id: String(f.get("product_id") ?? "") || undefined,
                  expires_at: ex ? new Date(ex).toISOString() : undefined,
                  notes: String(f.get("notes") ?? "").trim() || undefined,
                });
              }}>
                <div>
                  <Label>Client</Label>
                  <Select name="customer_id" required>
                    <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                    <SelectContent>
                      {(customers.data?.rows ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produit (optionnel)</Label>
                  <Select name="product_id">
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(products.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Expire le</Label><Input name="expires_at" type="datetime-local" /></div>
                <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                <DialogFooter><Button type="submit" disabled={m.isPending}>Créer</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Client</TableHead><TableHead>Produit</TableHead><TableHead>Statut</TableHead>
              <TableHead>Expire</TableHead><TableHead>Créé</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Aucun essai.</TableCell></TableRow>}
              {(data ?? []).map((t) => {
                const expired = t.expires_at && new Date(t.expires_at) < new Date();
                const status = expired && t.status === "active" ? "expired" : t.status;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{(t as any).customers?.email ?? t.customer_id}</TableCell>
                    <TableCell className="text-sm">{(t as any).products?.name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(t.expires_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                    <TableCell>{t.status === "active" && <Button size="sm" variant="outline" onClick={() => r.mutate(t.id)}>Révoquer</Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
