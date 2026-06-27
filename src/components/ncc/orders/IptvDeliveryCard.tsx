import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, MessageCircle, Send, Tv, CheckCircle2, PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { markIptvDeliverySent } from "@/lib/iptv-megaott.functions";
import { listInventoryAccounts, assignIptvAccountToOrder } from "@/lib/iptv-import.functions";

interface Delivery {
  iptv_account_id: string;
  megaott_subscription_id?: string | null;
  username: string;
  password?: string | null;
  package?: string | null;
  expires_at?: string | null;
  dns_link?: string | null;
  dns_link_samsung_lg?: string | null;
  portal_link?: string | null;
  max_connections?: number | null;
  delivery_status: "pending" | "ready_to_send" | "sent";
  sent_at?: string | null;
  sent_channel?: "email" | "whatsapp" | "telegram" | null;
}

export function IptvDeliveryCard({ orderId, metadata }: { orderId: string; metadata: any }) {
  const delivery = (metadata?.iptv_delivery ?? null) as Delivery | null;
  const qc = useQueryClient();
  const sendFn = useServerFn(markIptvDeliverySent);
  const mark = useMutation({
    mutationFn: (channel: "email" | "whatsapp" | "telegram") => sendFn({ data: { order_id: orderId, channel } }),
    onSuccess: () => { toast.success("Envoi enregistré"); qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="mt-4 border-primary/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Livraison IPTV</h3>
          </div>
          {delivery ? (
            delivery.delivery_status === "sent"
              ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Envoyé · {delivery.sent_channel}</Badge>
              : <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Abonnement affecté · Prêt à envoyer</Badge>
          ) : <Badge variant="outline">Aucun abonnement</Badge>}
        </div>

        {!delivery && (
          <div className="space-y-2">
            <AssignFromInventory orderId={orderId} />
            <p className="text-xs text-muted-foreground">
              Les abonnements sont créés dans MEGAOTT puis importés dans l'inventaire NEXORA.
              Affectez ici un abonnement disponible à cette commande.
            </p>
          </div>
        )}

        {delivery && (
          <>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Field label="Username">{delivery.username}</Field>
              <Field label="Password">{delivery.password ?? "—"}</Field>
              <Field label="Package">{delivery.package ?? "—"}</Field>
              <Field label="Expiration">{delivery.expires_at ? new Date(delivery.expires_at).toLocaleDateString() : "—"}</Field>
              <Field label="Max connexions">{delivery.max_connections ?? "—"}</Field>
              <Field label="DNS link" className="sm:col-span-2 truncate">{delivery.dns_link ?? "—"}</Field>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground self-center mr-2">Envoyer au client :</span>
              <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate("email")}>
                <Mail className="h-3 w-3 mr-1" /> Email
              </Button>
              <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate("whatsapp")}>
                <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate("telegram")}>
                <Send className="h-3 w-3 mr-1" /> Telegram
              </Button>
            </div>
            {delivery.delivery_status === "sent" && delivery.sent_at && (
              <p className="text-xs text-muted-foreground">Dernier envoi : {new Date(delivery.sent_at).toLocaleString()} ({delivery.sent_channel})</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function AssignFromInventory({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listFn = useServerFn(listInventoryAccounts);
  const assignFn = useServerFn(assignIptvAccountToOrder);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["iptv", "inventory", "available", search],
    queryFn: () => listFn({ data: { only_available: true, search: search || undefined, limit: 100 } }),
    enabled: open,
  });
  const m = useMutation({
    mutationFn: (account_id: string) => assignFn({ data: { order_id: orderId, account_id } }),
    onSuccess: () => {
      toast.success("Abonnement affecté à la commande");
      qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] });
      qc.invalidateQueries({ queryKey: ["iptv"] });
      setOpen(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackageSearch className="h-3 w-3 mr-1" /> Affecter un abonnement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Affecter un abonnement depuis le stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Rechercher un username…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="border rounded-lg max-h-[400px] overflow-auto divide-y">
            {q.isLoading && <div className="p-4 text-sm text-muted-foreground">Chargement…</div>}
            {!q.isLoading && rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Aucun abonnement disponible.</div>}
            {rows.map((a: any) => (
              <div key={a.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm truncate">{a.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {(a.package ?? a.bouquet ?? "—")} · {a.account_type} · expire {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <Button size="sm" disabled={m.isPending} onClick={() => m.mutate(a.id)}>Affecter</Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}