import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { megaottCreateSubscription } from "@/lib/iptv-megaott.functions";

type SubType = "m3u" | "mag" | "enigma";

function CopyRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground w-44 shrink-0">{label}</span>
      <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{value}</code>
      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copié"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function MegaottSubscriptionForm({ disabled }: { disabled?: boolean }) {
  const qc = useQueryClient();
  const create = useServerFn(megaottCreateSubscription);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SubType>("m3u");
  const [adult, setAdult] = useState(false);
  const [enableVpn, setEnableVpn] = useState(false);
  const [paid, setPaid] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [errorPayload, setErrorPayload] = useState<any>(null);

  const m = useMutation({
    mutationFn: (input: any) => create({ data: input }),
    onSuccess: (r: any) => {
      if (r.ok) {
        setResult(r);
        setErrorPayload(null);
        toast.success(`Abonnement créé (HTTP ${r.status}, ${r.durationMs}ms)`);
        qc.invalidateQueries({ queryKey: ["iptv"] });
        qc.invalidateQueries({ queryKey: ["ncc"] });
      } else {
        setResult(null);
        setErrorPayload(r);
        const detail = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
        toast.error(`MEGAOTT: ${r.error}${r.status ? ` (HTTP ${r.status})` : ""}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); setErrorPayload(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" /> Nouvel abonnement MEGAOTT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel abonnement — POST /api/v1/subscriptions</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const payload: Record<string, unknown> = {
              type,
              package: (f.get("package") as string) || undefined,
              template: (f.get("template") as string) || undefined,
              max_connections: Number(f.get("max_connections") || 1),
              forced_country: (f.get("forced_country") as string) || undefined,
              adult,
              enable_vpn: enableVpn,
              paid,
              whatsapp_telegram: (f.get("whatsapp_telegram") as string) || undefined,
              note: (f.get("note") as string) || undefined,
            };
            if (type === "m3u") payload.username = (f.get("username") as string) || undefined;
            if (type === "mag" || type === "enigma") payload.mac = (f.get("mac") as string) || undefined;
            m.mutate(payload);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SubType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m3u">M3U</SelectItem>
                  <SelectItem value="mag">MAG</SelectItem>
                  <SelectItem value="enigma">Enigma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Connections</Label>
              <Input name="max_connections" type="number" min={1} max={20} defaultValue={1} />
            </div>
          </div>

          {type === "m3u" && (
            <div>
              <Label>Username</Label>
              <Input name="username" placeholder="my_user" />
            </div>
          )}

          {(type === "mag" || type === "enigma") && (
            <div>
              <Label>MAC Address</Label>
              <Input name="mac" placeholder="00:1A:79:XX:XX:XX" required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Package</Label>
              <Input name="package" placeholder="ID ou nom du package" />
            </div>
            <div>
              <Label>Template</Label>
              <Input name="template" placeholder="ID ou nom du template" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Forced Country</Label>
              <Input name="forced_country" placeholder="FR, DE, US…" maxLength={8} />
            </div>
            <div>
              <Label>WhatsApp / Telegram</Label>
              <Input name="whatsapp_telegram" placeholder="+33… ou @handle" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={adult} onCheckedChange={setAdult} /> Adult
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={enableVpn} onCheckedChange={setEnableVpn} /> Enable VPN
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={paid} onCheckedChange={setPaid} /> Paid
            </label>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea name="note" rows={2} placeholder="Note interne (facultatif)" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={m.isPending}>Créer l'abonnement</Button>
          </DialogFooter>
        </form>

        {result?.ok && (
          <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" /> Abonnement créé sur MEGAOTT
            </div>
            <CopyRow label="ID" value={result.created?.id ? String(result.created.id) : null} />
            <CopyRow label="Username" value={result.created?.username} />
            <CopyRow label="Password" value={result.created?.password} />
            <CopyRow label="Package" value={result.created?.package ? String(result.created.package) : null} />
            <CopyRow label="Template" value={result.created?.template ? String(result.created.template) : null} />
            <CopyRow label="Expiration" value={result.created?.expiration} />
            <CopyRow label="DNS link" value={result.created?.dns_link} />
            <CopyRow label="DNS Samsung/LG" value={result.created?.dns_link_for_samsung_lg} />
            <CopyRow label="Portal link" value={result.created?.portal_link} />
          </div>
        )}

        {errorPayload && (
          <div className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-rose-700 font-medium">
              <AlertTriangle className="h-4 w-4" /> MEGAOTT a retourné une erreur
            </div>
            <div><span className="text-muted-foreground">Status :</span> {errorPayload.status ?? "—"}</div>
            <div><span className="text-muted-foreground">Message :</span> {errorPayload.error}</div>
            {errorPayload.response && (
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-background/60 p-2 text-xs">
                {typeof errorPayload.response === "string" ? errorPayload.response : JSON.stringify(errorPayload.response, null, 2)}
              </pre>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}