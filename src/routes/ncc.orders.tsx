import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag, Search } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrders } from "@/lib/ncc.functions";
import { ORDER_STATUSES } from "@/domain/types";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const list = useServerFn(listOrders);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "orders", { search, status }],
    queryFn: () => list({ data: { search, status: status === "all" ? undefined : status, page: 1, pageSize: 50 } }),
  });

  return (
    <div>
      <NccPageHeader icon={ShoppingBag} title="Commandes" description="Suivi global avec changement de statut contrôlé." />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Réf, email, nom, plan…" className="pl-8" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Référence</TableHead><TableHead>Client</TableHead><TableHead>Plan</TableHead>
              <TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead>Créée</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && (data?.rows ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Aucune commande.</TableCell></TableRow>}
              {(data?.rows ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell><Link to="/ncc/orders/$id" params={{ id: o.id }} className="font-mono text-xs hover:underline">{o.order_ref}</Link></TableCell>
                  <TableCell className="text-sm">{o.email}</TableCell>
                  <TableCell className="text-sm">{o.plan_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{fmtMoney(Number(o.amount), o.currency)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && <div className="text-xs text-muted-foreground">{data.total} commande(s)</div>}
        </CardContent>
      </Card>
    </div>
  );
}
