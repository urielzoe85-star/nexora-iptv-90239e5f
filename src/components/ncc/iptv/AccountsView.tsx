import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Download, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, fmtDate } from "@/components/ncc/ncc-ui";
import {
  listAccounts, createAccount, deleteAccount, transitionAccount,
  exportAccountsCsv, listProviders,
} from "@/lib/iptv.functions";
import { MegaottImportCard } from "./MegaottImportCard";

type Filter = {
  account_type?: "trial" | "premium";
  status?: "available" | "assigned" | "active" | "expired" | "suspended";
  expiring_within_days?: number;
  package?: "24 Hours" | "1 Month" | "3 Months" | "6 Months" | "1 Year";
};

export function AccountsView({
  filter = {}, defaultType = "premium", title, showImport = false, importLabel,
}: {
  filter?: Filter;
  defaultType?: "trial" | "premium";
  title?: string;
  showImport?: boolean;
  importLabel?: string;
}) {
  const list   = useServerFn(listAccounts);
  const create = useServerFn(createAccount);
  const del    = useServerFn(deleteAccount);
  const trans  = useServerFn(transitionAccount);
  const exp    = useServerFn(exportAccountsCsv);
  const provs  = useServerFn(listProviders);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const key = useMemo(() => ["iptv", "accounts", filter, search] as const, [filter, search]);
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: { ...filter, search: search || undefined } }) });
  const providers = useQuery({ queryKey: ["iptv", "providers"], queryFn: () => provs() });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["iptv"] }); };

  const mCreate = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => { toast.success("Compte ajouté"); setOpenCreate(false); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mTrans = useMutation({
    mutationFn: (v: { id: string; action: any; days?: number }) => trans({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error((e as Error).message),
  });

  const onExport = async () => {
    const r = await exp({ data: { account_type: filter.account_type, status: filter.status } });
    const blob = new Blob([r.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `iptv-accounts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {showImport && filter.package && (
        <MegaottImportCard
          account_type={filter.account_type ?? defaultType}
          pkg={filter.package}
          label={importLabel ?? filter.package}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {title && <h2 className="text-lg font-medium">{title}</h2>}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-64" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onExport}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau compte</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau compte IPTV</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ex = String(f.get("expires_at") ?? "");
                mCreate.mutate({
                  username: String(f.get("username") ?? ""),
                  password: String(f.get("password") ?? "") || undefined,
                  account_type: String(f.get("account_type") ?? defaultType),
                  bouquet: String(f.get("bouquet") ?? "") || undefined,
                  provider_id: String(f.get("provider_id") ?? "") || undefined,
                  expires_at: ex ? new Date(ex).toISOString() : undefined,
                  notes: String(f.get("notes") ?? "") || undefined,
                });
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Username</Label><Input name="username" required /></div>
                  <div><Label>Password</Label><Input name="password" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select name="account_type" defaultValue={defaultType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Essai gratuit</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Bouquet</Label><Input name="bouquet" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Fournisseur</Label>
                    <Select name="provider_id">
                      <SelectTrigger><SelectValue placeholder="Par défaut" /></SelectTrigger>
                      <SelectContent>
                        {(providers.data ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expire le</Label><Input name="expires_at" type="datetime-local" /></div>
                </div>
                <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                <DialogFooter><Button type="submit" disabled={mCreate.isPending}>Créer</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bouquet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!q.isLoading && (q.data ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Aucun compte.</TableCell></TableRow>}
              {(q.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.username}</TableCell>
                  <TableCell><StatusBadge status={a.account_type} /></TableCell>
                  <TableCell className="text-sm">{a.bouquet ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-sm">{a.customers?.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{a.iptv_providers?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(a.expires_at)}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {a.status !== "active" && <Button size="sm" variant="outline" onClick={() => mTrans.mutate({ id: a.id, action: "activate" })}>Activer</Button>}
                    {a.status === "active" && <Button size="sm" variant="outline" onClick={() => mTrans.mutate({ id: a.id, action: "suspend" })}>Suspendre</Button>}
                    {a.status === "suspended" && <Button size="sm" variant="outline" onClick={() => mTrans.mutate({ id: a.id, action: "reactivate" })}>Réactiver</Button>}
                    <Button size="sm" variant="outline" onClick={() => mTrans.mutate({ id: a.id, action: "renew", days: 30 })}>+30j</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ce compte ?")) mDel.mutate(a.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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