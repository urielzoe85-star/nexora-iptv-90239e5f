import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminUpdateOrder, adminConfirmPayment } from "@/lib/admin.functions";
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
import { Loader2, Search, CheckCircle2, MessageCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });

const STATUSES = ["all", "pending", "processing", "paid", "completed", "failed", "cancelled", "refunded"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Tous",
  pending: "En attente",
  processing: "En cours",
  paid: "Confirmé",
  completed: "Confirmé",
  failed: "Refusé",
  cancelled: "Annulé",
  refunded: "Remboursé",
};

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
  const confirm = useServerFn(adminConfirmPayment);
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<null | {
    orderRef: string;
    waLink: string | null;
    phone: string | null;
    message: string;
    emailSent: boolean;
    emailError: string | null;
  }>(null);

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

  async function confirmPayment() {
    if (!editing) return;
    setConfirming(true);
    try {
      const res = await confirm({ data: { id: editing.id } });
      // Ouvre WhatsApp Web pré-rempli pour notifier le client.
      if (res.waLink && typeof window !== "undefined") {
        window.open(res.waLink, "_blank", "noopener,noreferrer");
      }
      setConfirmed({
        orderRef: res.orderRef,
        waLink: res.waLink,
        phone: res.phone,
        message: res.message,
        emailSent: res.emailSent,
        emailError: res.emailError,
      });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la confirmation");
    } finally {
      setConfirming(false);
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
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
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
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Transaction SebPay</TableHead>
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
                      <TableCell className="text-xs">
                        {o.metadata?.momo?.phone ?? "—"}
                        {o.metadata?.momo?.operator && (
                          <div className="text-[10px] text-muted-foreground">{o.metadata.momo.operator}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{o.plan_name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {Number(o.amount).toLocaleString()} {o.currency}
                        {o.metadata?.usd_amount && (
                          <div className="text-[10px] text-muted-foreground">${Number(o.metadata.usd_amount).toFixed(2)} USD</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{o.sebpay_reference ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[o.status] ?? ""}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{new Date(o.created_at).toLocaleString()}</div>
                        {o.status === "paid" || o.status === "completed" ? (
                          <div className="text-[10px] text-emerald-500">Confirmé : {new Date(o.updated_at).toLocaleString()}</div>
                        ) : null}
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
            <Button variant="secondary" onClick={save}>Enregistrer</Button>
            <Button
              onClick={confirmPayment}
              disabled={confirming || editing?.status === "completed"}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {confirming ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirmation…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmer le paiement</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmed} onOpenChange={(o) => !o && setConfirmed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Paiement confirmé
            </DialogTitle>
          </DialogHeader>
          {confirmed && (
            <div className="space-y-4 text-sm">
              <p>
                La commande <span className="font-mono">{confirmed.orderRef}</span> a
                été marquée comme payée. Le client va recevoir une notification
                de confirmation.
              </p>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                  {confirmed.emailSent ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                      Envoyé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                      En attente (configurer le domaine email)
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">WhatsApp</span>
                  {confirmed.waLink ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                      Fenêtre ouverte — cliquez « Envoyer »
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                      Numéro indisponible
                    </Badge>
                  )}
                </div>
                {confirmed.phone && (
                  <p className="text-xs text-muted-foreground">
                    Numéro client : <span className="font-mono">{confirmed.phone}</span>
                  </p>
                )}
              </div>

              {confirmed.waLink && (
                <Button asChild variant="outline" className="w-full">
                  <a href={confirmed.waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" />
                    Rouvrir le message WhatsApp
                  </a>
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                Pensez à transmettre les accès (M3U / Xtream) au client dans les
                minutes qui suivent.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmed(null)}>
              Fermer
            </Button>
            <Button asChild>
              <a href="/admin">Retour au menu principal</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}