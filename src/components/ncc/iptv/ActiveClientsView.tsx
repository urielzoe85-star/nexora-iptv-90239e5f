import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, fmtDate } from "@/components/ncc/ncc-ui";
import { listActiveClients, transitionAccount } from "@/lib/iptv.functions";

const RENEW_DAYS: Record<string, number> = {
  "24 Hours": 1, "1 Month": 30, "3 Months": 90, "6 Months": 180, "1 Year": 365,
};

export function ActiveClientsView() {
  const list  = useServerFn(listActiveClients);
  const trans = useServerFn(transitionAccount);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [pkg, setPkg] = useState<string>("");

  const key = useMemo(() => ["iptv", "active-clients", pkg, search] as const, [pkg, search]);
  const q = useQuery({
    queryKey: key,
    queryFn: () => list({ data: { search: search || undefined, package: (pkg || undefined) as any } }),
  });

  const mTrans = useMutation({
    mutationFn: (v: { id: string; action: any; days?: number }) => trans({ data: v }),
    onSuccess: () => { toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["iptv"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client, username, owner…" className="w-72 pl-8" />
        </div>
        <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Tous les plans</option>
          {Object.keys(RENEW_DAYS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div className="text-xs text-muted-foreground ml-auto">
          {q.data?.length ?? 0} client(s) actif(s)
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>DNS</TableHead>
              <TableHead>Portal</TableHead>
              <TableHead>Connex.</TableHead>
              <TableHead>Dernière conn.</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>MegaOTT ID</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={13} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!q.isLoading && (q.data ?? []).length === 0 && <TableRow><TableCell colSpan={13} className="text-sm text-muted-foreground">Aucun client actif.</TableCell></TableRow>}
              {(q.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{a.customers?.full_name ?? a.customers?.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.customers?.email ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs">{a.package ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{a.username}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{a.dns_link ?? "—"}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{a.portal_link ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.max_connections ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(a.last_login)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.last_ip ?? "—"}</TableCell>
                  <TableCell className="text-xs">{fmtDate(a.expires_at)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-xs">{a.iptv_providers?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{a.megaott_subscription_id ?? "—"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => mTrans.mutate({ id: a.id, action: "renew", days: RENEW_DAYS[a.package ?? "1 Month"] ?? 30 })}>Renouveler</Button>
                    {a.status !== "suspended"
                      ? <Button size="sm" variant="ghost" onClick={() => mTrans.mutate({ id: a.id, action: "suspend" })}>Suspendre</Button>
                      : <Button size="sm" variant="ghost" onClick={() => mTrans.mutate({ id: a.id, action: "reactivate" })}>Réactiver</Button>}
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