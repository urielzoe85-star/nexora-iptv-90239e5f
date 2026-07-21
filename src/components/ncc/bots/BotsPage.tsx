import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Send, Webhook, ShieldCheck, ShieldAlert, RefreshCw, Radio, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getBotsStatus,
  setupTelegramWebhook,
  broadcastTelegram,
  testAdminAlert,
  getWhatsAppStatus,
  testAdminWhatsApp,
} from "@/lib/bots.functions";

export function BotsPage() {
  const status = useServerFn(getBotsStatus);
  const setupHook = useServerFn(setupTelegramWebhook);
  const broadcast = useServerFn(broadcastTelegram);
  const testAlert = useServerFn(testAdminAlert);
  const waStatus = useServerFn(getWhatsAppStatus);
  const waTest = useServerFn(testAdminWhatsApp);

  const defaultUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/telegram/webhook`
      : "";
  const [webhookUrl, setWebhookUrl] = useState(defaultUrl);
  const [message, setMessage] = useState("");

  const q = useQuery({ queryKey: ["bots", "status"], queryFn: () => status() });
  const wq = useQuery({ queryKey: ["bots", "whatsapp"], queryFn: () => waStatus() });

  const mSetup = useMutation({
    mutationFn: () => setupHook({ data: { url: webhookUrl } }),
    onSuccess: () => { toast.success("Webhook Telegram enregistré"); q.refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mTest = useMutation({
    mutationFn: () => testAlert(),
    onSuccess: (r: any) => r?.sent ? toast.success("Alerte admin envoyée") : toast.warning(r?.reason ?? "Non envoyée"),
    onError: (e) => toast.error((e as Error).message),
  });

  const mWaTest = useMutation({
    mutationFn: () => waTest(),
    onSuccess: (r: any) => r?.sent ? toast.success("Test WhatsApp envoyé") : toast.warning(r?.reason ?? "Non envoyé"),
    onError: (e) => toast.error((e as Error).message),
  });

  const mBroadcast = useMutation({
    mutationFn: (dryRun: boolean) => broadcast({ data: { message, dryRun } }),
    onSuccess: (r: any) => {
      if (r.dryRun) toast.info(`Cible : ${r.targeted} abonné(s)`);
      else { toast.success(`Envoyé à ${r.sent}/${r.targeted} (${r.failed} échec)`); setMessage(""); }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const s = q.data;
  const w = wq.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Bot className="h-4 w-4" /> Bot Telegram</CardTitle></CardHeader>
          <CardContent>
            {s?.bot ? (
              <>
                <div className="text-lg font-semibold">@{s.bot.username}</div>
                <div className="text-xs text-muted-foreground">{s.bot.first_name} · ID {s.bot.id}</div>
                <Badge className="mt-2 bg-emerald-500/15 text-emerald-500 border-emerald-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> En ligne</Badge>
              </>
            ) : (
              <>
                <div className="text-sm">Non connecté</div>
                <Badge variant="secondary" className="mt-2"><ShieldAlert className="h-3 w-3 mr-1" /> {s?.error ?? "Attente"}</Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs break-all text-muted-foreground">{s?.webhook?.url || "Aucun webhook enregistré"}</div>
            {s?.webhook?.last_error_message && (
              <div className="text-xs text-destructive mt-1">Dernière erreur : {s.webhook.last_error_message}</div>
            )}
            <div className="text-xs mt-2">Mises à jour en attente : {s?.webhook?.pending_update_count ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Radio className="h-4 w-4" /> Diffusion</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{s?.subscribers ?? 0}</div>
            <div className="text-xs text-muted-foreground">clients contactables sur Telegram</div>
            <div className="mt-2">
              <Badge variant={s?.adminChatConfigured ? "default" : "secondary"}>
                {s?.adminChatConfigured ? "Alertes admin activées" : "TELEGRAM_ADMIN_CHAT_ID manquant"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4" /> Configuration du webhook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="wh">URL du webhook (à enregistrer chez Telegram)</Label>
          <div className="flex gap-2">
            <Input id="wh" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <Button onClick={() => mSetup.mutate()} disabled={mSetup.isPending || !webhookUrl}>
              {mSetup.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Le secret est dérivé automatiquement de la clé de connexion Telegram. Utilise l'URL stable de production (project--&lt;id&gt;.lovable.app) pour éviter les régénérations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Alertes admin</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Les nouvelles commandes, paiements confirmés et échecs sont envoyés dans le chat défini par <code className="text-xs">TELEGRAM_ADMIN_CHAT_ID</code>. Écris <code className="text-xs">/start</code> à ton bot pour obtenir ton chat_id, puis renseigne-le en secret projet.
          </p>
          {s && s.adminChatConfigured && !s.adminChatIsNumeric && (
            <p className="text-xs text-destructive">
              ⚠️ TELEGRAM_ADMIN_CHAT_ID ne ressemble pas à un chat_id (attendu : nombre entier). Un numéro de téléphone ne fonctionne pas.
            </p>
          )}
          <Button variant="outline" onClick={() => mTest.mutate()} disabled={mTest.isPending}>
            {mTest.isPending ? "Envoi…" : "Envoyer un test"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp Cloud API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {w?.configured ? (
            <>
              {w.phone ? (
                <div className="text-sm">
                  <div className="font-semibold">{w.phone.display_phone_number} · {w.phone.verified_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Qualité : {w.phone.quality_rating ?? "n/a"} · Vérification : {w.phone.code_verification_status ?? "n/a"} · Phone ID {w.phoneNumberId}
                  </div>
                  <Badge className="mt-2 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Connecté
                  </Badge>
                </div>
              ) : (
                <Badge variant="destructive">
                  <ShieldAlert className="h-3 w-3 mr-1" /> {w.error ?? "Erreur inconnue"}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                Note Meta : hors fenêtre 24h, seuls les <strong>templates approuvés</strong> passent (erreur <code>#131047</code>). Le texte libre ne fonctionne qu'après un message entrant du client.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => wq.refetch()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mWaTest.mutate()}
                  disabled={mWaTest.isPending || !w.adminPhoneConfigured}
                >
                  {mWaTest.isPending ? "Envoi…" : "Envoyer un test à l'admin"}
                </Button>
              </div>
              {!w.adminPhoneConfigured && (
                <p className="text-xs text-muted-foreground">Définis <code>WHATSAPP_ADMIN_PHONE</code> (E.164) pour activer le test.</p>
              )}
            </>
          ) : (
            <Badge variant="secondary">
              <ShieldAlert className="h-3 w-3 mr-1" /> {w?.error ?? "WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant"}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Diffusion Telegram</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="msg">Message (Markdown supporté)</Label>
          <Textarea id="msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="🎉 Promo du week-end : -20% sur les plans annuels…" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => mBroadcast.mutate(true)} disabled={!message || mBroadcast.isPending}>Prévisualiser la cible</Button>
            <Button onClick={() => mBroadcast.mutate(false)} disabled={!message || mBroadcast.isPending || !s?.subscribers}>
              {mBroadcast.isPending ? "Envoi…" : `Envoyer à ${s?.subscribers ?? 0} client(s)`}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Seuls les clients ayant lié leur compte via <code>/start &lt;réf&gt;</code> reçoivent la diffusion.</p>
        </CardContent>
      </Card>
    </div>
  );
}