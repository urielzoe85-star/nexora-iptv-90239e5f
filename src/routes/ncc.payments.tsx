import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPayments } from "@/lib/ncc.functions";
import { PAYMENT_PROVIDER_LIST } from "@/domain/providers/payments";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const list = useServerFn(listPayments);
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "payments", { status }],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status, page: 1, pageSize: 50 } }),
  });

  return (
    <div className="space-y-4">
      <NccPageHeader icon={CreditCard} title="Paiements" description="Architecture multi-passerelles : un seul service métier, plusieurs adapters." />

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Passerelles enregistrées</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PAYMENT_PROVIDER_LIST.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <span className="text-sm">{p.label}</span>
                {p.enabled
                  ? <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="h-3 w-3" /> branchée</span>
                  : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3 w-3" /> stub</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="paid">paid</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="refunded">refunded</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Commande</TableHead><TableHead>Email</TableHead><TableHead>Méthode</TableHead>
              <TableHead>Montant</TableHead><TableHead>Réf. passerelle</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && (data?.rows ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Aucun paiement.</TableCell></TableRow>}
              {(data?.rows ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell><Link to="/ncc/orders/$id" params={{ id: p.id }} className="font-mono text-xs hover:underline">{p.order_ref}</Link></TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell className="text-sm">{p.method ?? "—"}</TableCell>
                  <TableCell className="text-sm">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{p.sebpay_reference ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
