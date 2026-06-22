import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminUpdateOrder } from "@/lib/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });

const STATUSES = ["all", "pending", "processing", "paid", "completed", "failed", "cancelled", "refunded"] as const;

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  processing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-500 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-purple-500/15 text-purple-500 border-purple-500/30",
};

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrder);
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, search],
    queryFn: () => list({ data: { status, search, limit: 100 } }),
  });

  async function save() {
    if (!editing) return;
    try {
      await update({ data: { id: editing.id, status: editing.status, admin_notes: editing.admin_notes ?? "" } });
      toast.success("Commande mise à jour");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Commandes</h1>
        <p className="text-sm text-muted-foreground">Gérez les commandes clients et leur statut.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher (ref, email, nom)"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data || data.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Aucune commande.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Réf.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_ref}</TableCell>
                      <TableCell>
                        <div className="text-sm">{o.full_name}</div>
                        <div className="text-xs text-muted-foreground">{o.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{o.plan_name}</TableCell>
                      <TableCell>${Number(o.amount).toFixed(2)} {o.currency}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[o.status] ?? ""}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing({ ...o })}>Gérer</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commande {editing?.order_ref}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client</span><div>{editing.full_name}</div></div>
                <div><span className="text-muted-foreground">Email</span><div>{editing.email}</div></div>
                <div><span className="text-muted-foreground">Plan</span><div>{editing.plan_name}</div></div>
                <div><span className="text-muted-foreground">Montant</span><div>${Number(editing.amount).toFixed(2)} {editing.currency}</div></div>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter((s) => s !== "all").map((s) =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes internes</Label>
                <Textarea rows={3} value={editing.admin_notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}