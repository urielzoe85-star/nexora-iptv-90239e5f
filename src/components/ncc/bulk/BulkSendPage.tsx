import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Mail, MessageCircle, Loader2, Users, RefreshCw, Upload, FileWarning, Trash2, Download, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { listBulkTargets, listBulkTemplates, bulkSendMessages } from "@/lib/bulk-send.functions";
import {
  buildDeliveryContext, renderTemplate, type DeliveryChannel,
} from "@/domain/delivery/message-engine";

type Scenario = "delivery" | "renewal" | "payment_reminder" | "marketing" | "custom";

const SCENARIO_LABEL: Record<Scenario, string> = {
  delivery: "Livraison des accès",
  renewal: "Rappel de renouvellement",
  payment_reminder: "Relance de paiement",
  marketing: "Marketing / Promo",
  custom: "Message personnalisé",
};

const CUSTOM_VARS = [
  "client_name", "product_name", "portal_link", "renew_url",
  "expiration_date", "username", "order_ref",
] as const;

const CHANNEL_META: Record<DeliveryChannel, { icon: any; label: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  telegram: { icon: Send, label: "Telegram" },
  email: { icon: Mail, label: "Email" },
};

type Source = "database" | "csv";

type ImportedTarget = {
  id: string;
  kind: "manual";
  label: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
  _row: number;
};

type RejectedRow = { row: number; raw: string; reason: string };

// ── CSV parsing minimal (support quotes + virgules/point-virgules/tab) ──
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Détection du séparateur sur la 1ère ligne non vide.
  const first = src.split("\n").find((l) => l.trim().length) ?? "";
  const sep = [",", ";", "\t"].sort((a, b) => (first.split(b).length - first.split(a).length))[0];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x && x.trim().length));
}

function normalizePhone(v: string): string | null {
  const digits = v.replace(/[^\d+]/g, "");
  if (!digits) return null;
  // Doit avoir au moins 7 chiffres pour être plausible.
  if (digits.replace(/\D/g, "").length < 7) return null;
  return digits.startsWith("+") ? digits : digits;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkSendPage() {
  const [scenario, setScenario] = useState<Scenario>("renewal");
  const [days, setDays] = useState<number>(7);
  const [channels, setChannels] = useState<DeliveryChannel[]>(["whatsapp", "email"]);
  const [templateId, setTemplateId] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const customBodyRef = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<Source>("database");
  const [imported, setImported] = useState<ImportedTarget[]>([]);
  const [rejected, setRejected] = useState<RejectedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const isCustom = scenario === "custom";

  // Sélection auto du 1er template compatible.
  const currentTemplate = useMemo(() => {
    if (templateId && filteredTemplates.find((t) => t.id === templateId)) {
      return filteredTemplates.find((t) => t.id === templateId)!;
    }
    return filteredTemplates[0];
  }, [templateId, filteredTemplates]);

  const targets = useQuery({
    queryKey: ["bulk", "targets", scenario, days],
    queryFn: () => listTargetsFn({ data: { scenario, days, limit: 200 } }) as Promise<any[]>,
    enabled: source === "database",
  });

  const activeTargets = source === "csv" ? imported : (targets.data ?? []);

  const toggleChannel = (ch: DeliveryChannel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const toggleAll = () => {
    if (!activeTargets.length) return;
    if (selected.size === activeTargets.length) setSelected(new Set());
    else setSelected(new Set(activeTargets.map((t: any) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const preview = useMemo(() => {
    const body = isCustom ? customBody : currentTemplate?.body;
    if (!body || !activeTargets.length) return "";
    const first: any = activeTargets.find((t: any) => selected.has(t.id)) ?? activeTargets[0];
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
    return renderTemplate(body, ctx);
  }, [currentTemplate, activeTargets, selected, isCustom, customBody]);

  const send = useMutation({
    mutationFn: async () => {
      if (isCustom) {
        if (customBody.trim().length < 10) throw new Error("Rédige un message d'au moins 10 caractères.");
      } else if (!currentTemplate) {
        throw new Error("Sélectionne un template.");
      }
      if (!channels.length) throw new Error("Sélectionne au moins un canal.");
      const chosen = activeTargets.filter((t: any) => selected.has(t.id));
      if (!chosen.length) throw new Error("Sélectionne au moins un destinataire.");
      return bulkSendFn({
        data: {
          template_id: isCustom ? "custom" : currentTemplate!.id,
          custom_subject: isCustom ? (customSubject.trim() || undefined) : undefined,
          custom_body: isCustom ? customBody : undefined,
          channels,
          scenario,
          targets: chosen.map((t: any) => ({
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

  const allChecked = activeTargets.length > 0 && selected.size === activeTargets.length;

  const insertVar = (v: string) => {
    const token = `{{${v}}}`;
    const el = customBodyRef.current;
    if (!el) { setCustomBody((prev) => prev + token); return; }
    const start = el.selectionStart ?? customBody.length;
    const end = el.selectionEnd ?? customBody.length;
    const next = customBody.slice(0, start) + token + customBody.slice(end);
    setCustomBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // ── Import CSV ────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { toast.error("Fichier vide."); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
    const iPhone = idx(["phone", "telephone", "téléphone", "whatsapp", "wa", "msisdn"]);
    const iEmail = idx(["email", "e-mail", "mail"]);
    const iTg = idx(["telegram_chat_id", "telegram", "chat_id", "tg"]);
    const iName = idx(["full_name", "name", "nom", "client"]);
    if (iPhone < 0 && iEmail < 0 && iTg < 0) {
      toast.error("En-têtes manquants. Attendus : phone, email, telegram_chat_id.");
      return;
    }
    const accepted: ImportedTarget[] = [];
    const rej: RejectedRow[] = [];
    const seen = new Set<string>();
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const raw = cells.join(" | ");
      const phoneRaw = iPhone >= 0 ? (cells[iPhone] ?? "").trim() : "";
      const emailRaw = iEmail >= 0 ? (cells[iEmail] ?? "").trim() : "";
      const tgRaw = iTg >= 0 ? (cells[iTg] ?? "").trim() : "";
      const name = iName >= 0 ? (cells[iName] ?? "").trim() : "";
      const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
      const email = emailRaw ? (EMAIL_RE.test(emailRaw) ? emailRaw.toLowerCase() : "__invalid__") : null;
      const tg = tgRaw ? tgRaw.replace(/[^\d-]/g, "") : null;

      if (phoneRaw && !phone) { rej.push({ row: r + 1, raw, reason: "téléphone invalide" }); continue; }
      if (email === "__invalid__") { rej.push({ row: r + 1, raw, reason: "email invalide" }); continue; }
      if (tgRaw && !tg) { rej.push({ row: r + 1, raw, reason: "telegram_chat_id invalide" }); continue; }
      if (!phone && !email && !tg) { rej.push({ row: r + 1, raw, reason: "aucun contact" }); continue; }

      const dedupKey = `${phone ?? ""}|${email ?? ""}|${tg ?? ""}`;
      if (seen.has(dedupKey)) { rej.push({ row: r + 1, raw, reason: "doublon" }); continue; }
      seen.add(dedupKey);

      accepted.push({
        id: `csv-${r}-${dedupKey}`,
        kind: "manual",
        label: name || email || phone || tg || `Ligne ${r + 1}`,
        full_name: name || null,
        email: email && email !== "__invalid__" ? email : null,
        phone,
        telegram_chat_id: tg,
        _row: r + 1,
      });
    }
    setImported(accepted);
    setRejected(rej);
    setSelected(new Set(accepted.map((a) => a.id)));
    toast.success(`${accepted.length} ligne(s) importée(s) · ${rej.length} rejetée(s)`);
  };

  const downloadTemplate = () => {
    const csv = "full_name,phone,email,telegram_chat_id\nJean Dupont,+237698000000,jean@example.com,123456789\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modele-destinataires.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRejected = () => {
    if (!rejected.length) return;
    const csv = "row,reason,raw\n" + rejected.map((r) => `${r.row},"${r.reason}","${r.raw.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lignes-rejetees.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* PANEL DE CONFIG */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={(v) => { setSource(v as Source); setSelected(new Set()); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="database">🗂️ Base de données</SelectItem>
                  <SelectItem value="csv">📥 Import CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Scénario</Label>
              <Select value={scenario} onValueChange={(v) => { setScenario(v as Scenario); setSelected(new Set()); setTemplateId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">📦 {SCENARIO_LABEL.delivery}</SelectItem>
                  <SelectItem value="renewal">🔁 {SCENARIO_LABEL.renewal}</SelectItem>
                  <SelectItem value="payment_reminder">💳 {SCENARIO_LABEL.payment_reminder}</SelectItem>
                  <SelectItem value="marketing">🎁 {SCENARIO_LABEL.marketing}</SelectItem>
                  <SelectItem value="custom">✍️ {SCENARIO_LABEL.custom}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {source === "database" && <div>
              <Label className="text-xs">
                {scenario === "renewal" ? "Expiration dans (jours)" : "Commandes des derniers (jours)"}
              </Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 3, 7, 14, 30, 60].map((d) => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}
                </SelectContent>
              </Select>
            </div>}

            {source === "csv" && (
              <div className="space-y-2">
                <Label className="text-xs">Fichier CSV</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
                <Button size="sm" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" /> Importer un CSV
                </Button>
                <Button size="sm" variant="ghost" className="w-full" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Télécharger le modèle
                </Button>
                {imported.length > 0 && (
                  <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => { setImported([]); setRejected([]); setSelected(new Set()); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Vider l'import
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">Colonnes reconnues : full_name, phone, email, telegram_chat_id.</p>
              </div>
            )}

            {!isCustom && (
              <div>
                <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> Template</Label>
                <Select value={currentTemplate?.id ?? ""} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un template" /></SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isCustom && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><PenLine className="h-3 w-3" /> Sujet (email)</Label>
                <Input
                  value={customSubject}
                  maxLength={200}
                  placeholder="Ex. Une offre pour vous"
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
                <Label className="text-xs">Message</Label>
                <Textarea
                  ref={customBodyRef}
                  value={customBody}
                  maxLength={4000}
                  rows={8}
                  placeholder={"Bonjour {{client_name}},\n\nVotre message ici…"}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-1">
                  {CUSTOM_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/40 hover:bg-muted font-mono"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {customBody.length}/4000 · Les variables sont remplacées pour chaque destinataire.
                </p>
              </div>
            )}

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
              disabled={send.isPending || !selected.size || !channels.length || (isCustom ? customBody.trim().length < 10 : !currentTemplate)}
            >
              {send.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Envoi…</> : <><Send className="h-4 w-4 mr-2"/>Envoyer à {selected.size} destinataire(s)</>}
            </Button>
          </CardContent>
        </Card>

        {/* PANEL CIBLES + PREVIEW */}
        <div className="space-y-4">
          {source === "csv" && rejected.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <FileWarning className="h-4 w-4" /> {rejected.length} ligne(s) rejetée(s)
                </CardTitle>
                <Button size="sm" variant="outline" onClick={downloadRejected}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Télécharger le rapport
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[140px]">
                  <div className="space-y-1 text-xs font-mono">
                    {rejected.slice(0, 100).map((r) => (
                      <div key={r.row} className="flex gap-2">
                        <span className="text-muted-foreground w-12 shrink-0">L{r.row}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{r.reason}</Badge>
                        <span className="truncate text-muted-foreground">{r.raw}</span>
                      </div>
                    ))}
                    {rejected.length > 100 && <div className="text-muted-foreground italic">…et {rejected.length - 100} autres.</div>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Destinataires ({activeTargets.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {source === "database" && (
                  <Button size="sm" variant="ghost" onClick={() => targets.refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={toggleAll} disabled={!activeTargets.length}>
                  {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {source === "database" && targets.isLoading ? (
                <div className="text-sm text-muted-foreground p-4">Chargement…</div>
              ) : !activeTargets.length ? (
                <div className="text-sm text-muted-foreground p-4">
                  {source === "csv" ? "Importe un CSV pour commencer." : "Aucun destinataire pour ce scénario."}
                </div>
              ) : (
                <ScrollArea className="h-[340px]">
                  <div className="space-y-1">
                    {activeTargets.map((t: any) => {
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