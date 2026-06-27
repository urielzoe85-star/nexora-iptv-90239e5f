import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle, Send, KeyRound, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_TEMPLATES } from "@/domain/delivery/builtin-templates";
import {
  buildAccessSnippet, buildDeliveryContext, normalizePhoneForWa, renderTemplate,
  type DeliveryChannel,
} from "@/domain/delivery/message-engine";
import { logDelivery, listDeliveryLogs } from "@/lib/delivery.functions";
import { markIptvDeliverySent } from "@/lib/iptv-megaott.functions";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback DOM
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); document.body.removeChild(ta); return true; }
    catch { document.body.removeChild(ta); return false; }
  }
}

interface Props {
  orderId: string;
  order: any;
  customer: any;
  delivery: any;
}

export function DeliveryComposer({ orderId, order, customer, delivery }: Props) {
  const ctx = useMemo(() => buildDeliveryContext({ order, customer, delivery }), [order, customer, delivery]);
  const qc = useQueryClient();
  const logFn = useServerFn(logDelivery);
  const markSentFn = useServerFn(markIptvDeliverySent);
  const listLogsFn = useServerFn(listDeliveryLogs);

  const [channel, setChannel] = useState<DeliveryChannel>("whatsapp");
  const [templateId, setTemplateId] = useState<string>("fr_standard");
  const tpl = BUILTIN_TEMPLATES.find((t) => t.id === templateId)!;

  const [subject, setSubject] = useState<string>(renderTemplate(tpl.subject ?? "", ctx));
  const [body, setBody] = useState<string>(renderTemplate(tpl.body, ctx));

  // Quand on change de template, on recharge sujet/corps.
  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = BUILTIN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(renderTemplate(t.subject ?? "", ctx));
    setBody(renderTemplate(t.body, ctx));
  }

  const logs = useQuery({
    queryKey: ["delivery", "logs", orderId],
    queryFn: () => listLogsFn({ data: { order_id: orderId, limit: 20 } }),
  });

  const log = useMutation({
    mutationFn: (p: Parameters<typeof logFn>[0]["data"]) => logFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery", "logs", orderId] }),
  });

  async function handleCopyAccess() {
    const snippet = buildAccessSnippet(ctx);
    const ok = await copy(snippet);
    if (!ok) return toast.error("Impossible de copier");
    toast.success("Accès copiés");
    log.mutate({ order_id: orderId, channel, status: "copied", template_id: "access_snippet", content: snippet });
  }

  async function handleCopyMessage() {
    const ok = await copy(body);
    if (!ok) return toast.error("Impossible de copier");
    toast.success("Message copié");
    log.mutate({ order_id: orderId, channel, status: "copied", template_id: templateId, subject: channel === "email" ? subject : undefined, content: body });
  }

  async function handleSendWhatsApp() {
    await copy(body);
    const phone = normalizePhoneForWa(ctx.phone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(body)}`
      : `https://wa.me/?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
    toast.success(phone ? "WhatsApp ouvert" : "WhatsApp ouvert (numéro client manquant)");
    log.mutate({ order_id: orderId, channel: "whatsapp", status: "sent", template_id: templateId, content: body, recipient: ctx.phone || undefined });
    try { await markSentFn({ data: { order_id: orderId, channel: "whatsapp" } }); } catch { /* noop */ }
    qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] });
  }

  async function handleSendTelegram() {
    await copy(body);
    const tgUser = (customer?.metadata?.telegram_username as string | undefined)?.replace(/^@/, "");
    const url = tgUser
      ? `https://t.me/${tgUser}?text=${encodeURIComponent(body)}`
      : `https://t.me/share/url?url=${encodeURIComponent("https://nexora-iptv.com")}&text=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
    toast.success("Telegram ouvert — message copié, collez-le dans le chat");
    log.mutate({ order_id: orderId, channel: "telegram", status: "sent", template_id: templateId, content: body, recipient: tgUser ?? undefined });
    try { await markSentFn({ data: { order_id: orderId, channel: "telegram" } }); } catch { /* noop */ }
    qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] });
  }

  function handleSendEmail() {
    const to = ctx.email;
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    toast.success("Client mail ouvert");
    log.mutate({ order_id: orderId, channel: "email", status: "sent", template_id: templateId, subject, content: body, recipient: to });
    markSentFn({ data: { order_id: orderId, channel: "email" } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["ncc", "order", orderId] });
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        <h4 className="font-medium">Composer la livraison</h4>
      </div>

      <Tabs value={channel} onValueChange={(v) => setChannel(v as DeliveryChannel)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="whatsapp"><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="telegram"><Send className="h-3 w-3 mr-1" /> Telegram</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-3 w-3 mr-1" /> Email</TabsTrigger>
        </TabsList>

        <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label className="text-xs">Modèle</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUILTIN_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyAccess}>
            <KeyRound className="h-3 w-3 mr-1" /> Copier les accès
          </Button>
        </div>

        <TabsContent value="email" className="mt-3 space-y-2">
          <div>
            <Label className="text-xs">Destinataire</Label>
            <Input value={ctx.email} readOnly className="bg-muted/30" />
          </div>
          <div>
            <Label className="text-xs">Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-3">
          <div>
            <Label className="text-xs">Numéro WhatsApp</Label>
            <Input value={ctx.phone || "(non renseigné — WhatsApp s'ouvrira sans destinataire)"} readOnly className="bg-muted/30" />
          </div>
        </TabsContent>

        <TabsContent value="telegram" className="mt-3">
          <div>
            <Label className="text-xs">Telegram</Label>
            <Input
              value={(customer?.metadata?.telegram_username as string | undefined) ?? "(non renseigné — partage générique)"}
              readOnly className="bg-muted/30"
            />
          </div>
        </TabsContent>

        <div className="mt-3">
          <Label className="text-xs">Message (modifiable)</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleCopyMessage}>
            <Copy className="h-3 w-3 mr-1" /> Copier le message
          </Button>
          {channel === "whatsapp" && (
            <Button size="sm" onClick={handleSendWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="h-3 w-3 mr-1" /> Envoyer via WhatsApp
            </Button>
          )}
          {channel === "telegram" && (
            <Button size="sm" onClick={handleSendTelegram} className="bg-sky-600 hover:bg-sky-700 text-white">
              <Send className="h-3 w-3 mr-1" /> Envoyer via Telegram
            </Button>
          )}
          {channel === "email" && (
            <Button size="sm" onClick={handleSendEmail} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!ctx.email}>
              <Mail className="h-3 w-3 mr-1" /> Envoyer par Email
            </Button>
          )}
        </div>
      </Tabs>

      <div className="border-t pt-3">
        <div className="flex items-center gap-2 mb-2">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Historique des envois</span>
        </div>
        {logs.isLoading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!logs.isLoading && (logs.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Aucun envoi enregistré pour cette commande.</p>
        )}
        <ul className="space-y-1 max-h-40 overflow-auto">
          {(logs.data ?? []).map((l: any) => (
            <li key={l.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="capitalize">{l.channel}</Badge>
              <Badge
                className={
                  l.status === "sent" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                  : l.status === "copied" ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                  : l.status === "failed" ? "bg-red-500/15 text-red-700 border-red-500/30"
                  : "bg-muted text-foreground"
                }
                variant="outline"
              >{l.status}</Badge>
              <span className="text-muted-foreground truncate flex-1">{l.template_id ?? "—"}</span>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}