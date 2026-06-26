import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrder, transitionOrderStatus } from "@/lib/ncc.functions";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/domain/types";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getOrder);
  const trans = useServerFn(transitionOrderStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "order", id],
    queryFn: () => fn({ data: { id } }),
  });
  const m = useMutation({
    mutationFn: (next: OrderStatus) => trans({ data: { id, next } }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["ncc", "order", id] }); qc.invalidateQueries({ queryKey: ["ncc", "orders"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Commande introuvable.</div>;
  const o = data.order;
  const next = ORDER_TRANSITIONS[o.status as OrderStatus] ?? [];

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/ncc/orders"><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Link></Button>
      <NccPageHeader icon={ShoppingBag} title={o.order_ref} description={o.email} action={<StatusBadge status={o.status} />} />
      <Card className="mb-4">
        <CardContent className="pt-6 grid sm:grid-cols-4 gap-4 text-sm">
          <Field label="Plan">{o.plan_name ?? "—"}</Field>
          <Field label="Montant">{fmtMoney(Number(o.amount), o.currency)}</Field>
          <Field label="Méthode">{o.method ?? "—"}</Field>
          <Field label="Référence passerelle">{o.sebpay_reference ?? "—"}</Field>
          <Field label="Client">{data.customer ? <Link to="/ncc/clients/$id" params={{ id: data.customer.id }} className="hover:underline">{data.customer.email}</Link> : <span className="text-muted-foreground">non lié</span>}</Field>
          <Field label="Créée">{fmtDate(o.created_at)}</Field>
          <Field label="Mise à jour">{fmtDate(o.updated_at)}</Field>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Transitions autorisées</div>
          {next.length === 0 && <div className="text-sm text-muted-foreground">Aucune transition possible depuis ce statut.</div>}
          <div className="flex flex-wrap gap-2">
            {next.map((n) => (
              <Button key={n} size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate(n)}>→ {n}</Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1">{children}</div></div>;
}