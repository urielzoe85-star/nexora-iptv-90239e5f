import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Mail, MessageCircle, Loader2, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { listBulkTargets, listBulkTemplates, bulkSendMessages } from "@/lib/bulk-send.functions";
import {
  buildDeliveryContext, renderTemplate, type DeliveryChannel,
} from "@/domain/delivery/message-engine";

type Scenario = "delivery" | "renewal" | "payment_reminder";

const SCENARIO_LABEL: Record<Scenario, string> = {
  delivery: "Livraison des accès",
  renewal: "Rappel de renouvellement",
  payment_reminder: "Relance de paiement",
};

const CHANNEL_META: Record<DeliveryChannel, { icon: any; label: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  telegram: { icon: Send, label: "Telegram" },
  email: { icon: Mail, label: "Email" },
};

export function BulkSendPage() {
  const [scenario, setScenario] = useState<Scenario>("renewal");
  const [days, setDays] = useState<number>(7);
  const [channels, setChannels] = useState<DeliveryChannel[]>(["whatsapp", "email"]);
  const [templateId, setTemplateId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const listTargetsFn = useServerFn(listBulkTargets);
  const listTemplatesFn = useServerFn(listBulkTemplates);
  const bulkSendFn = useServerFn(bulkSendMessages);

  const templates = useQuery({
    queryKey: ["bulk", "templates"],
    queryFn: () => listTemplatesFn(),
  });

  const filteredTemplates = useMemo(
    () => (templates.data ?? []).filter((t) => t.scenario === scenario),
    [templates.data, scenario],
  );

  // Sélection auto du 1er template compatible.
  const currentTemplate = useMemo(() => {
    if (templateId && filteredTemplates.find((t) => t.id === templateId)) {
      return filteredTemplates.find((t) => t.id === templateId)!;
    }
    return filteredTemplates[0];
  }, [templateId, filteredTemplates]);

  const targets = useQuery({
    queryKey: ["bulk", "targets", scenario, days],
    queryFn: () => listTargetsFn({ data: { scenario, days, limit: 200 } }),
  });

  const toggleChannel = (ch: DeliveryChannel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const toggleAll = () => {
    if (!targets.data) return;
    if (selected.size === targets.data.length) setSelected(new Set());
    else setSelected(new Set(targets.data.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const preview = useMemo(() => {
    if (!currentTemplate || !targets.data?.length) return "";
    const first = targets.data.find((t) => selected.has(t.id)) ?? targets.data[0];
    const ctx = buildDeliveryContext({
      order: {
        order_ref: (first as any).order_ref ?? "",
        plan_name: (first as any).plan_name ?? (first as any).package,
        amount: (first as any).amount,
        currency: (first as any).currency ?? "XAF",
        full_name: first.full_name,
        email: first.email,
        phone: first.phone,
        metadata: (first as any).metadata ?? {},
      },
      customer: { email: first.email, full_name: first.full_name, phone: first.phone },
      delivery: first.kind === "iptv_account"
        ? { username: first.label, package: (first as any).package, expires_at: (first as any).expires_at }
        : {},
    });
    return renderTemplate(currentTemplate.body, ctx);
  }, [currentTemplate, targets.data, selected]);

  const send = useMutation({
    mutationFn: async () => {
      if (!currentTemplate) throw new Error("Sélectionne un template.");
      if (!channels.length) throw new Error("Sélectionne au moins un canal.");
      const chosen = (targets.data ?? []).filter((t) => selected.has(t.id));
      if (!chosen.length) throw new Error("Sélectionne au moins un destinataire.");
      return bulkSendFn({
        data: {
          template_id: currentTemplate.id,
          channels,
          scenario,
          targets: chosen.map((t) => ({
            kind: t.kind, id: t.id, label: t.label,
            customer_id: t.customer_id ?? null,
            email: t.email, full_name: t.full_name, phone: t.phone,
            telegram_chat_id: (t as any).telegram_chat_id ?? null,
            order_ref: (t as any).order_ref ?? null,
            plan_name: (t as any).plan_name ?? null,
            amount: (t as any).amount ?? null,
            currency: (t as any).currency ?? null,
            package: (t as any).package ?? null,
            expires_at: (t as any).expires_at ?? null,
            metadata: (t as any).metadata ?? null,
          })),
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Envoi terminé : ${res.sent} envoyés · ${res.failed} échecs · ${res.skipped} ignorés`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur d'envoi"),
  });

  const allChecked = targets.data && targets.data.length > 0 && selected.size === targets.data.length;

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* PANEL DE CONFIG */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Scénario</Label>
              <Select value={scenario} onValueChange={(v) => { setScenario(v as Scenario); setSelected(new Set()); setTemplateId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">📦 {SCENARIO_LABEL.delivery}</SelectItem>
                  <SelectItem value="renewal">🔁 {SCENARIO_LABEL.renewal}</SelectItem>
                  <SelectItem value="payment_reminder">💳 {SCENARIO_LABEL.payment_reminder}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">
                {scenario === "renewal" ? "Expiration dans (jours)" : "Commandes des derniers (jours)"}
              </Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 3, 7, 14, 30, 60].map((d) => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Template</Label>
              <Select value={currentTemplate?.id ?? ""} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choisir un template" /></SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Canaux</Label>
              <div className="flex flex-col gap-2 mt-2">
                {(Object.keys(CHANNEL_META) as DeliveryChannel[]).map((ch) => {
                  const { icon: Icon, label } = CHANNEL_META[ch];
                  return (
                    <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => send.mutate()}
              disabled={send.isPending || !selected.size || !channels.length || !currentTemplate}
            >
              {send.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Envoi…</> : <><Send className="h-4 w-4 mr-2"/>Envoyer à {selected.size} destinataire(s)</>}
            </Button>
          </CardContent>
        </Card>

        {/* PANEL CIBLES + PREVIEW */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Destinataires ({targets.data?.length ?? 0})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => targets.refetch()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={toggleAll} disabled={!targets.data?.length}>
                  {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {targets.isLoading ? (
                <div className="text-sm text-muted-foreground p-4">Chargement…</div>
              ) : !targets.data?.length ? (
                <div className="text-sm text-muted-foreground p-4">Aucun destinataire pour ce scénario.</div>
              ) : (
                <ScrollArea className="h-[340px]">
                  <div className="space-y-1">
                    {targets.data.map((t) => {
                      const missing: string[] = [];
                      if (channels.includes("email") && !t.email) missing.push("email");
                      if (channels.includes("whatsapp") && !t.phone) missing.push("wa");
                      if (channels.includes("telegram") && !(t as any).telegram_chat_id) missing.push("tg");
                      return (
                        <label key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                          <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleOne(t.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {t.full_name || t.label} <span className="text-muted-foreground font-normal">· {t.label}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {t.email ?? "—"} · {t.phone ?? "—"}
                              {(t as any).days_left !== undefined && <> · <b>J-{(t as any).days_left}</b></>}
                              {(t as any).amount && <> · {(t as any).amount} {(t as any).currency}</>}
                            </div>
                          </div>
                          {missing.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">manque {missing.join(",")}</Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Aperçu du message</CardTitle></CardHeader>
            <CardContent>
              <Textarea readOnly value={preview} className="min-h-[180px] font-mono text-xs" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}