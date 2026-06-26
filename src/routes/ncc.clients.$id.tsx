import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Users } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getCustomer, setCustomerStatus } from "@/lib/ncc.functions";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getCustomer);
  const setStatus = useServerFn(setCustomerStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "customer", id],
    queryFn: () => fn({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (status: "active" | "disabled") => setStatus({ data: { id, status } }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["ncc", "customer", id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Client introuvable.</div>;
  const c = data.customer;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/ncc/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Link></Button>
      <NccPageHeader
        icon={Users}
        title={c.full_name ?? c.email}
        description={c.email}
        action={
          c.status === "active"
            ? <Button variant="outline" size="sm" onClick={() => m.mutate("disabled")}>Désactiver</Button>
            : <Button size="sm" onClick={() => m.mutate("active")}>Réactiver</Button>
        }
      />
      <Card className="mb-4">
        <CardContent className="pt-6 grid sm:grid-cols-4 gap-4 text-sm">
          <Info label="Statut"><StatusBadge status={c.status} /></Info>
          <Info label="Téléphone">{c.phone ?? "—"}</Info>
          <Info label="Pays">{c.country ?? "—"}</Info>
          <Info label="Créé le">{fmtDate(c.created_at)}</Info>
          {c.notes && <div className="sm:col-span-4"><div className="text-xs text-muted-foreground">Notes</div><div>{c.notes}</div></div>}
        </CardContent>
      </Card>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Commandes ({data.orders.length})</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements ({data.subscriptions.length})</TabsTrigger>
          <TabsTrigger value="trials">Essais ({data.trials.length})</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="history">Historique ({data.events.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Plan</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead>Créé</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.orders.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Aucune commande liée.</TableCell></TableRow>}
                {data.orders.map((o) => (
                  <TableRow key={o.order_ref}><TableCell className="font-mono text-xs">{o.order_ref}</TableCell><TableCell>{o.plan_name ?? "—"}</TableCell><TableCell>{fmtMoney(o.amount, o.currency)}</TableCell><TableCell><StatusBadge status={o.status} /></TableCell><TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="subscriptions">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead>Statut</TableHead><TableHead>Début</TableHead><TableHead>Expire</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.subscriptions.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Aucun abonnement.</TableCell></TableRow>}
                {data.subscriptions.map((s) => (
                  <TableRow key={s.id}><TableCell className="text-xs">{s.product_id ?? "—"}</TableCell><TableCell><StatusBadge status={s.status} /></TableCell><TableCell className="text-xs">{fmtDate(s.started_at)}</TableCell><TableCell className="text-xs">{fmtDate(s.expires_at)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="trials">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Statut</TableHead><TableHead>Expire</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.trials.length === 0 && <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">Aucun essai.</TableCell></TableRow>}
                {data.trials.map((t) => (
                  <TableRow key={t.id}><TableCell><StatusBadge status={t.status} /></TableCell><TableCell className="text-xs">{fmtDate(t.expires_at)}</TableCell><TableCell className="text-xs">{t.notes ?? "—"}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="tickets">
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">Le module Support n'est pas encore disponible.</CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="pt-6 space-y-2 text-sm">
            {data.events.length === 0 && <div className="text-muted-foreground">Aucun événement.</div>}
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border/40 py-1.5">
                <span>{e.type}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}