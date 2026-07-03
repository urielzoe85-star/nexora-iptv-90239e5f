import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Tv, Send, MessageCircle, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Delivery {
  iptv_account_id: string;
  username: string;
  password?: string | null;
  package?: string | null;
  account_type?: "trial" | "premium" | null;
  provider?: string | null;
  duration_months?: number | null;
  expires_at?: string | null;
  max_connections?: number | null;
  dns_link?: string | null;
  dns_link_samsung_lg?: string | null;
  portal_link?: string | null;
  m3u_url?: string | null;
  m3u_with_options_url?: string | null;
  enigma_url?: string | null;
  playlist_download_url?: string | null;
  enigma_download_url?: string | null;
  delivery_status?: string;
  channels_sent?: Record<string, { at: string; ok: boolean; error?: string | null }>;
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

export function DeliveryPreview({
  delivery,
  orderRef,
  onDispatch,
  dispatching,
}: {
  delivery: Delivery;
  orderRef?: string | null;
  onDispatch?: (channels?: Array<"email" | "whatsapp" | "telegram">) => void;
  dispatching?: boolean;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const credentialsSnippet =
    `Username: ${delivery.username}\n` +
    `Password: ${delivery.password ?? "—"}\n` +
    (delivery.dns_link ? `DNS: ${delivery.dns_link}\n` : "") +
    (delivery.dns_link_samsung_lg ? `Samsung/LG: ${delivery.dns_link_samsung_lg}\n` : "") +
    (delivery.m3u_url ? `M3U: ${delivery.m3u_url}\n` : "") +
    (delivery.package ? `Package: ${delivery.package}\n` : "") +
    (delivery.expires_at ? `Expiration: ${new Date(delivery.expires_at).toLocaleDateString()}\n` : "");

  async function copyAndFlash(text: string, label: string) {
    const ok = await copyText(text);
    if (!ok) return toast.error("Copie impossible");
    setCopiedField(label);
    toast.success(`${label} copié`);
    setTimeout(() => setCopiedField(null), 1500);
  }

  const chSent = delivery.channels_sent ?? {};

  return (
    <Card className="bg-slate-950 text-slate-100 border-slate-800">
      <CardContent className="p-5 space-y-5">
        {/* Header MEGAOTT-style */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">Fiche de livraison IPTV</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Générée automatiquement — identique à l'email client
              {orderRef ? ` · commande ${orderRef}` : ""}
            </p>
          </div>
          {delivery.delivery_status === "sent" && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Envoyée</Badge>
          )}
          {delivery.delivery_status === "failed" && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/40">Échec</Badge>
          )}
          {(delivery.delivery_status === "ready_to_send" || delivery.delivery_status === "pending") && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Prête à envoyer</Badge>
          )}
        </div>

        {/* Type */}
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Type</div>
          <div className="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm">
            m3u_plus (avec options) {delivery.account_type ? `· ${delivery.account_type}` : ""}
          </div>
        </div>

        {/* M3U Link */}
        {delivery.m3u_url && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Lien M3U</div>
            <div className="flex gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-300 flex-1 truncate">
                {delivery.m3u_url}
              </div>
              <Button
                type="button" size="icon" variant="outline"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800"
                onClick={() => copyAndFlash(delivery.m3u_url ?? "", "Lien M3U")}
                aria-label="Copier le lien M3U"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Connection Details */}
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Connection Details</div>
          <div className="bg-slate-900 border border-slate-800 rounded-md p-3 text-sm font-mono space-y-1">
            <div>👤 Username: <span className="text-slate-100">{delivery.username}</span></div>
            <div>🔑 Password: <span className="text-slate-100">{delivery.password ?? "—"}</span></div>
            {delivery.dns_link && <div>🔗 DNS: <span className="text-slate-300 break-all">{delivery.dns_link}</span></div>}
            {delivery.dns_link_samsung_lg && (
              <div>📺 Samsung & LG DNS: <span className="text-slate-300 break-all">{delivery.dns_link_samsung_lg}</span></div>
            )}
            {delivery.enigma_url && <div>📡 Enigma: <span className="text-slate-300 break-all">{delivery.enigma_url}</span></div>}
            {delivery.package && <div>📦 Package: <span className="text-slate-100">{delivery.package}</span></div>}
            {typeof delivery.max_connections === "number" && (
              <div>👥 Connexions: <span className="text-slate-100">{delivery.max_connections}</span></div>
            )}
            {delivery.expires_at && (
              <div>⏳ Expire le: <span className="text-slate-100">{new Date(delivery.expires_at).toLocaleDateString()}</span></div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button" variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100"
            onClick={() => copyAndFlash(credentialsSnippet, "Identifiants")}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            {copiedField === "Identifiants" ? "Copié ✓" : "Copier les identifiants"}
          </Button>
          <Button
            type="button" variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100"
            disabled={!delivery.m3u_url}
            onClick={() => copyAndFlash(delivery.m3u_url ?? "", "Lien M3U")}
          >
            <Copy className="h-3.5 w-3.5 mr-2" /> Copier le lien M3U
          </Button>
          {delivery.playlist_download_url && (
            <Button asChild variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100">
              <a href={delivery.playlist_download_url} target="_blank" rel="noopener">
                <Download className="h-3.5 w-3.5 mr-2" /> Télécharger la playlist M3U
              </a>
            </Button>
          )}
          {delivery.enigma_download_url && (
            <Button asChild variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100">
              <a href={delivery.enigma_download_url} target="_blank" rel="noopener">
                <Download className="h-3.5 w-3.5 mr-2" /> Télécharger Enigma
              </a>
            </Button>
          )}
        </div>

        {/* Dispatch */}
        {onDispatch && (
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-400">Envoi automatique</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button" size="sm" variant="outline"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100"
                disabled={dispatching}
                onClick={() => onDispatch(["email"])}
              >
                <Mail className="h-3.5 w-3.5 mr-1" /> Email
                {chSent.email?.ok && <span className="ml-1 text-emerald-400">✓</span>}
              </Button>
              <Button
                type="button" size="sm" variant="outline"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100"
                disabled={dispatching}
                onClick={() => onDispatch(["whatsapp"])}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                {chSent.whatsapp?.ok && <span className="ml-1 text-emerald-400">✓</span>}
              </Button>
              <Button
                type="button" size="sm" variant="outline"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100"
                disabled={dispatching}
                onClick={() => onDispatch(["telegram"])}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Telegram
                {chSent.telegram?.ok && <span className="ml-1 text-emerald-400">✓</span>}
              </Button>
            </div>
            <Button
              type="button" className="w-full bg-primary hover:bg-primary/90"
              disabled={dispatching}
              onClick={() => onDispatch()}
            >
              <Zap className="h-3.5 w-3.5 mr-2" />
              {dispatching ? "Envoi en cours…" : "Tout envoyer maintenant"}
            </Button>
            {Object.entries(chSent).length > 0 && (
              <ul className="text-xs text-slate-400 space-y-0.5 pt-1">
                {Object.entries(chSent).map(([ch, st]) => (
                  <li key={ch} className="flex items-center gap-1.5">
                    <span className="capitalize w-16">{ch}</span>
                    {st.ok
                      ? <span className="text-emerald-400">✓ envoyé {new Date(st.at).toLocaleString()}</span>
                      : <span className="text-amber-400">⚠ {st.error ?? "non envoyé"}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Instructions d'installation</div>
          <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
            <li>Ouvrez votre application IPTV (IPTV Smarters, TiviMate, GSE Smart IPTV…).</li>
            <li>Collez le lien M3U ou saisissez les identifiants (Username / Password / DNS).</li>
            <li>La liste des chaînes se charge automatiquement. Profitez !</li>
          </ol>
        </div>

        {/* Meta pill footer */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
          <Tv className="h-3 w-3" />
          {delivery.provider ?? "Nexora IPTV"}
          {delivery.duration_months ? ` · ${delivery.duration_months} mois` : ""}
        </div>
      </CardContent>
    </Card>
  );
}