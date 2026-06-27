import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { iptvInventoryKpis, listInventoryAccounts } from "@/lib/iptv-import.functions";
import { fmtDate } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/iptv/inventory")({ component: InventoryPage });

const ALL = "__all__";
const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  reserved:  "bg-amber-500/15 text-amber-700 border-amber-500/30",
  assigned:  "bg-sky-500/15 text-sky-700 border-sky-500/30",
  delivered: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  active:    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  expired:   "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
  suspended: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  disabled:  "bg-red-500/15 text-red-700 border-red-500/30",
};

function InventoryPage() {
  const kpiFn = useServerFn(iptvInventoryKpis);
  const listFn = useServerFn(listInventoryAccounts);
  const kpis = useQuery({ queryKey: ["iptv", "inventory", "kpis"], queryFn: () => kpiFn() });

  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [pkg, setPkg] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [expiring, setExpiring] = useState<string>(ALL);

  const filter = useMemo(() => ({
    status: status === ALL ? undefined : status,
    account_type: type === ALL ? undefined : (type as "trial" | "premium"),
    package: pkg === ALL ? undefined : pkg,
    search: search || undefined,
    expiring_within_days: expiring === ALL ? undefined : Number(expiring),
  }), [status, type, pkg, search, expiring]);

  const accounts = useQuery({
    queryKey: ["iptv", "inventory", filter],
    queryFn: () => listFn({ data: filter }),
  });

  const packages = useMemo(() => Object.keys(kpis.data?.byPackage ?? {}).filter(p => p !== "—"), [kpis.data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total importés" value={kpis.data?.total ?? 0} />
        <Kpi label="Disponibles" value={kpis.data?.byStatus.available ?? 0} accent="emerald" />
        <Kpi label="Affectés" value={(kpis.data?.byStatus.assigned ?? 0) + (kpis.data?.byStatus.delivered ?? 0)} accent="sky" />
        <Kpi label="Expirés" value={kpis.data?.byStatus.expired ?? 0} accent="zinc" />
        <Kpi label="Désactivés" value={kpis.data?.byStatus.disabled ?? 0} accent="red" />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Recherche</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Username…" />
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {["available", "reserved", "assigned", "delivered", "active", "expired", "suspended", "disabled"].map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Package</Label>
              <Select value={pkg} onValueChange={setPkg}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {packages.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Expire dans</Label>
              <Select value={expiring} onValueChange={setExpiring}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>—</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Expire</TableHead>
                  <TableHead>Importé</TableHead>
                  <TableHead>ID MEGAOTT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.isLoading && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!accounts.isLoading && (accounts.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Aucun abonnement.</TableCell></TableRow>
                )}
                {(accounts.data ?? []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.username}</TableCell>
                    <TableCell className="text-sm">{a.package ?? a.bouquet ?? "—"}</TableCell>
                    <TableCell className="text-sm">{a.account_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[a.status] ?? ""}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(a.expires_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(a.imported_at ?? a.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{a.megaott_subscription_id ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${accent ? `text-${accent}-600` : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}