import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveMegaottDelivery } from "@/lib/iptv-megaott.functions";

interface Props {
  orderId: string;
  trigger: React.ReactNode;
}

export function MegaottDeliveryForm({ orderId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    megaott_subscription_id: "",
    username: "",
    password: "",
    package: "",
    expires_at: "",
    dns_link: "",
    dns_link_samsung_lg: "",
    portal_link: "",
    note: "",
  });
  const qc = useQueryClient();
  const save = useServerFn(saveMegaottDelivery);
  const m = useMutation({
    mutationFn: () => save({ data: { order_id: orderId, ...form } as any }),
    onSuccess: () => {
      toast.success("Abonnement enregistré — prêt à envoyer au client");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Saisir les informations MEGAOTT</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID abonnement MEGAOTT"><Input value={form.megaott_subscription_id} onChange={set("megaott_subscription_id")} /></Field>
          <Field label="Package"><Input value={form.package} onChange={set("package")} /></Field>
          <Field label="Username *"><Input value={form.username} onChange={set("username")} /></Field>
          <Field label="Password *"><Input value={form.password} onChange={set("password")} /></Field>
          <Field label="Expiration"><Input type="date" value={form.expires_at} onChange={set("expires_at")} /></Field>
          <Field label="Portal link"><Input value={form.portal_link} onChange={set("portal_link")} /></Field>
          <Field label="DNS link" className="col-span-2"><Input value={form.dns_link} onChange={set("dns_link")} /></Field>
          <Field label="DNS Samsung / LG" className="col-span-2"><Input value={form.dns_link_samsung_lg} onChange={set("dns_link_samsung_lg")} /></Field>
          <Field label="Note" className="col-span-2"><Textarea rows={2} value={form.note} onChange={set("note")} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={!form.username || !form.password || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}