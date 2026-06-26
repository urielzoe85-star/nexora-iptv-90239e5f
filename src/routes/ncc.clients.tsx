import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, Plus, Search } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { listCustomers, createCustomer } from "@/lib/ncc.functions";
import { fmtDate, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const list = useServerFn(listCustomers);
  const create = useServerFn(createCustomer);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<"created_at" | "email" | "full_name">("created_at");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "customers", { search, status, sort }],
    queryFn: () => list({ data: { search, status: status === "all" ? undefined : (status as "active" | "disabled"), sort, page: 1, pageSize: 50, direction: "desc" } }),
  });

  const m = useMutation({
    mutationFn: (input: { email: string; full_name?: string; phone?: string; country?: string }) =>
      create({ data: input }),
    onSuccess: () => {
      toast.success("Client créé");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ncc", "customers"] });
      qc.invalidateQueries({ queryKey: ["ncc", "kpis"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <NccPageHeader
        icon={Users}
        title="Clients"
        description="Base clients unifiée — recherche, tri, création et historique."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  m.mutate({
                    email: String(f.get("email") ?? "").trim(),
                    full_name: String(f.get("full_name") ?? "").trim() || undefined,
                    phone: String(f.get("phone") ?? "").trim() || undefined,
                    country: String(f.get("country") ?? "").trim().toUpperCase() || undefined,
                  });
                }}
              >
                <div><Label>Email</Label><Input name="email" type="email" required /></div>
                <div><Label>Nom complet</Label><Input name="full_name" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Téléphone</Label><Input name="phone" /></div>
                  <div><Label>Pays (ISO-2)</Label><Input name="country" maxLength={2} /></div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={m.isPending}>{m.isPending ? "Création…" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche email / nom / téléphone…" className="pl-8" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="disabled">Désactivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Plus récents</SelectItem>
                <SelectItem value="email">Email (A-Z)</SelectItem>
                <SelectItem value="full_name">Nom (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (<TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">Chargement…</TableCell></TableRow>)}
              {!isLoading && (data?.rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">Aucun client.</TableCell></TableRow>
              )}
              {(data?.rows ?? []).map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell><Link to="/ncc/clients/$id" params={{ id: c.id }} className="hover:underline">{c.email}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{c.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{fmtDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && <div className="text-xs text-muted-foreground">{data.total} client(s)</div>}
        </CardContent>
      </Card>
    </div>
  );
}
