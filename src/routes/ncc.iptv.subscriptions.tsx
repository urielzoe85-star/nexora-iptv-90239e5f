import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tv2, Plus } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { listSubscriptions, createSubscription, transitionSubscription, listCustomers, listProducts } from "@/lib/ncc.functions";
import { fmtDate, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/iptv/subscriptions")({ component: IptvPage });

type Action = "activate" | "suspend" | "expire" | "cancel" | "renew";

function IptvPage() {
  const list = useServerFn(listSubscriptions);
  const create = useServerFn(createSubscription);
  const trans = useServerFn(transitionSubscription);
  const lc = useServerFn(listCustomers);
  const lp = useServerFn(listProducts);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["ncc", "subs"], queryFn: () => list() });
  const customers = useQuery({ queryKey: ["ncc", "customers", "for-pick"], queryFn: () => lc({ data: { page: 1, pageSize: 100, sort: "email", direction: "asc" } }) });
  const products = useQuery({ queryKey: ["ncc", "products", "iptv"], queryFn: () => lp({ data: { category: "iptv" } }) });

  const m = useMutation({
    mutationFn: (input: { customer_id: string; product_id?: string; expires_at?: string }) => create({ data: input }),
    onSuccess: () => { toast.success("Abonnement créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["ncc", "subs"] }); qc.invalidateQueries({ queryKey: ["ncc", "kpis"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const t = useMutation({
    mutationFn: (v: { id: string; action: Action }) => trans({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ncc", "subs"] }); qc.invalidateQueries({ queryKey: ["ncc", "kpis"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <NccPageHeader
        icon={Tv2} title="IPTV Manager" description="Abonnements : création, activation, renouvellement, suspension, expiration."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvel abonnement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel abonnement</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ex = String(f.get("expires_at") ?? "");
                m.mutate({
                  customer_id: String(f.get("customer_id") ?? ""),
                  product_id: String(f.get("product_id") ?? "") || undefined,
                  expires_at: ex ? new Date(ex).toISOString() : undefined,
                });
              }}>
                <div>
                  <Label>Client</Label>
                  <Select name="customer_id" required>
                    <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                    <SelectContent>{(customers.data?.rows ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produit IPTV</Label>
                  <Select name="product_id">
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{(products.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Expire le</Label><Input name="expires_at" type="datetime-local" /></div>
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
              <TableHead>Début</TableHead><TableHead>Expire</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Aucun abonnement.</TableCell></TableRow>}
              {(data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{(s as any).customers?.email ?? s.customer_id}</TableCell>
                  <TableCell className="text-sm">{(s as any).products?.name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(s.started_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(s.expires_at)}</TableCell>
                  <TableCell className="space-x-1">
                    {s.status !== "active"   && <Button size="sm" variant="outline" onClick={() => t.mutate({ id: s.id, action: "activate" })}>Activer</Button>}
                    {s.status === "active"   && <Button size="sm" variant="outline" onClick={() => t.mutate({ id: s.id, action: "suspend" })}>Suspendre</Button>}
                    {s.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => t.mutate({ id: s.id, action: "renew" })}>+30j</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
