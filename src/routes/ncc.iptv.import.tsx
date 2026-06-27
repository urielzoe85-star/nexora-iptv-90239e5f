import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, Save, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  parseIptvImportFile, commitIptvImport,
  listImportMappings, saveImportMapping, deleteImportMapping,
  NEXORA_IPTV_FIELDS, type NexoraIptvField,
} from "@/lib/iptv-import.functions";

export const Route = createFileRoute("/ncc/iptv/import")({ component: ImportPage });

type Step = 1 | 2 | 3;
type ParsedFile = {
  headers: string[];
  rows: Record<string, any>[];
  sample: Record<string, any>[];
  totalRows: number;
  filename: string;
  format: "csv" | "xls" | "xlsx";
};

const NONE_VALUE = "__none__";

const FIELD_LABELS: Record<NexoraIptvField, string> = {
  username: "Username",
  password: "Password",
  package: "Package",
  expires_at: "Expiration",
  dns_link: "DNS Link",
  dns_link_samsung_lg: "DNS Samsung/LG",
  portal_link: "Portal Link",
  mac_address: "MAC Address",
  type: "Type (trial/premium)",
  max_connections: "Nb. connexions",
  megaott_subscription_id: "ID MEGAOTT",
  notes: "Notes",
};

function guessMapping(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, "");
  const tries: Record<NexoraIptvField, string[]> = {
    username: ["username", "user", "login", "utilisateur"],
    password: ["password", "pass", "mdp", "motdepasse"],
    package: ["package", "bouquet", "plan", "forfait"],
    expires_at: ["expiration", "expiresat", "expirationdate", "expirydate", "expdate", "expire"],
    dns_link: ["dnslink", "dns", "m3u", "m3ulink", "url"],
    dns_link_samsung_lg: ["dnssamsung", "dnslg", "dnslinkforsamsunglg", "dnslinksamsunglg"],
    portal_link: ["portallink", "portal"],
    mac_address: ["mac", "macaddress", "macaddr"],
    type: ["type", "category"],
    max_connections: ["maxconnections", "connections", "nbconnections", "connexions"],
    megaott_subscription_id: ["id", "subscriptionid", "megaottid", "subid"],
    notes: ["notes", "note", "comment", "comments"],
  };
  for (const field of NEXORA_IPTV_FIELDS) {
    const candidates = tries[field];
    const found = headers.find(h => candidates.includes(norm(h)));
    if (found) m[field] = found;
  }
  return m;
}

function ImportPage() {
  const [step, setStep] = useState<Step>(1);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dedupe, setDedupe] = useState<"skip" | "update">("skip");
  const [defaultType, setDefaultType] = useState<"trial" | "premium">("premium");
  const [savedName, setSavedName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const parseFn = useServerFn(parseIptvImportFile);
  const commitFn = useServerFn(commitIptvImport);
  const listMapFn = useServerFn(listImportMappings);
  const saveMapFn = useServerFn(saveImportMapping);
  const delMapFn = useServerFn(deleteImportMapping);

  const mappings = useQuery({ queryKey: ["iptv", "mappings"], queryFn: () => listMapFn() });

  const mParse = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const format = file.name.toLowerCase().endsWith(".csv") ? "csv"
                    : file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
      const res = await parseFn({ data: { filename: file.name, format, base64: b64 } });
      return { ...res, filename: file.name, format } as ParsedFile;
    },
    onSuccess: (p) => {
      setParsed(p);
      // Try to load default mapping; otherwise guess.
      const def = (mappings.data ?? []).find(m => m.is_default);
      setMapping(def?.mapping ?? guessMapping(p.headers));
      setStep(2);
    },
    onError: (e) => toast.error(`Parse impossible: ${(e as Error).message}`),
  });

  const mCommit = useMutation({
    mutationFn: () => commitFn({
      data: {
        filename: parsed!.filename,
        file_format: parsed!.format,
        mapping,
        rows: parsed!.rows,
        dedupe_strategy: dedupe,
        default_account_type: defaultType,
      },
    }),
    onSuccess: (r) => {
      toast.success(`Import OK : ${r.inserted} créés, ${r.updated} mis à jour, ${r.skipped} ignorés${r.errors ? `, ${r.errors} erreurs` : ""}`);
      qc.invalidateQueries({ queryKey: ["iptv"] });
      setStep(1); setParsed(null); setMapping({});
    },
    onError: (e) => toast.error(`Import échoué: ${(e as Error).message}`),
  });

  const mSaveMap = useMutation({
    mutationFn: (name: string) => saveMapFn({ data: { name, mapping, is_default: false } }),
    onSuccess: () => { toast.success("Mapping enregistré"); setSavedName(""); qc.invalidateQueries({ queryKey: ["iptv", "mappings"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mDelMap = useMutation({
    mutationFn: (id: string) => delMapFn({ data: { id } }),
    onSuccess: () => { toast.success("Mapping supprimé"); qc.invalidateQueries({ queryKey: ["iptv", "mappings"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mappedSample = useMemo(() => {
    if (!parsed) return [];
    return parsed.sample.map(row => {
      const out: Record<string, any> = {};
      for (const field of NEXORA_IPTV_FIELDS) {
        const col = mapping[field];
        out[field] = col ? row[col] : null;
      }
      return out;
    });
  }, [parsed, mapping]);

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-3 text-sm">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-medium ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
            <span className={step === n ? "font-medium" : "text-muted-foreground"}>
              {n === 1 ? "Fichier" : n === 2 ? "Mapping" : "Aperçu & import"}
            </span>
            {n < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-medium mb-1">Import IPTV depuis MEGAOTT</h3>
              <p className="text-sm text-muted-foreground">
                Importez un export CSV, XLS ou XLSX provenant de MEGAOTT. Les abonnements iront dans le stock disponible.
              </p>
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30 transition"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) mParse.mutate(f);
              }}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm">Glissez-déposez votre fichier ici, ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-1">.csv, .xls, .xlsx</p>
              <input
                ref={fileRef} type="file" hidden
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) mParse.mutate(f); }}
              />
            </div>
            {mParse.isPending && <p className="text-sm text-muted-foreground">Analyse en cours…</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && parsed && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{parsed.filename}</span>
                <Badge variant="outline">{parsed.totalRows} lignes</Badge>
              </div>
              {(mappings.data?.length ?? 0) > 0 && (
                <Select onValueChange={(id) => {
                  const m = mappings.data?.find(x => x.id === id);
                  if (m) setMapping(m.mapping as Record<string, string>);
                }}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Charger un mapping…" /></SelectTrigger>
                  <SelectContent>
                    {(mappings.data ?? []).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}{m.is_default ? " ★" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Associer les colonnes</Label>
              <div className="border rounded-lg divide-y">
                {NEXORA_IPTV_FIELDS.map(field => (
                  <div key={field} className="grid grid-cols-2 gap-3 p-3 items-center">
                    <div className="text-sm font-medium">{FIELD_LABELS[field]}</div>
                    <Select
                      value={mapping[field] ?? NONE_VALUE}
                      onValueChange={(v) => setMapping(prev => {
                        const next = { ...prev };
                        if (v === NONE_VALUE) delete next[field]; else next[field] = v;
                        return next;
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— Aucun —</SelectItem>
                        {parsed.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-end border-t pt-4">
              <div className="grow">
                <Label className="text-xs">Enregistrer ce mapping sous</Label>
                <Input value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="Nom du mapping (ex. MEGAOTT v1)" />
              </div>
              <Button size="sm" variant="outline" disabled={!savedName || mSaveMap.isPending} onClick={() => mSaveMap.mutate(savedName)}>
                <Save className="h-3 w-3 mr-1" /> Enregistrer
              </Button>
            </div>

            {(mappings.data?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {(mappings.data ?? []).map(m => (
                  <Badge key={m.id} variant="secondary" className="gap-1">
                    {m.name}
                    <button onClick={() => mDelMap.mutate(m.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => { setStep(1); setParsed(null); }}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Changer de fichier
              </Button>
              <Button onClick={() => setStep(3)} disabled={!mapping.username}>
                Aperçu <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {!mapping.username && (
              <p className="text-xs text-amber-600">Le champ « Username » est requis avant de continuer.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && parsed && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs">Doublons</Label>
                <Select value={dedupe} onValueChange={(v) => setDedupe(v as "skip" | "update")}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Ignorer les existants</SelectItem>
                    <SelectItem value="update">Mettre à jour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type par défaut</Label>
                <Select value={defaultType} onValueChange={(v) => setDefaultType(v as "trial" | "premium")}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground ml-auto">
                Aperçu des 10 premières lignes — total : <b>{parsed.totalRows}</b>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {NEXORA_IPTV_FIELDS.filter(f => mapping[f]).map(f => (
                      <TableHead key={f} className="whitespace-nowrap">{FIELD_LABELS[f]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedSample.map((r, i) => (
                    <TableRow key={i}>
                      {NEXORA_IPTV_FIELDS.filter(f => mapping[f]).map(f => (
                        <TableCell key={f} className="text-xs whitespace-nowrap max-w-[240px] truncate">
                          {r[f] != null ? String(r[f]) : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Modifier le mapping
              </Button>
              <Button onClick={() => mCommit.mutate()} disabled={mCommit.isPending}>
                {mCommit.isPending ? "Import…" : `Importer ${parsed.totalRows} lignes`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}