import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  parseIptvImportFile, commitIptvImport, detectMegaottMapping, MEGAOTT_COLUMNS,
} from "@/lib/iptv-import.functions";

export const Route = createFileRoute("/ncc/iptv/import")({ component: ImportPage });

type ParsedFile = {
  headers: string[];
  rows: Record<string, any>[];
  sample: Record<string, any>[];
  totalRows: number;
  filename: string;
  format: "csv" | "xls" | "xlsx";
};

const PREVIEW_FIELDS: { key: string; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "package",  label: "Package" },
  { key: "type",     label: "Type" },
  { key: "paid",     label: "Paid" },
  { key: "trial",    label: "Trial" },
  { key: "expires_at", label: "Expiration" },
  { key: "max_connections", label: "Max Conn." },
  { key: "owner",    label: "Owner" },
];

function ImportPage() {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [dedupe, setDedupe] = useState<"skip" | "update">("update");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const parseFn = useServerFn(parseIptvImportFile);
  const commitFn = useServerFn(commitIptvImport);

  const mapping = useMemo(
    () => (parsed ? detectMegaottMapping(parsed.headers) : {}),
    [parsed],
  );
  const missingColumns = useMemo(
    () => parsed
      ? MEGAOTT_COLUMNS.filter(col => !parsed.headers.some(h => h.toLowerCase().replace(/[\s_\-\.]+/g, "") === col.toLowerCase().replace(/[\s_\-\.]+/g, "")))
      : [],
    [parsed],
  );

  const mParse = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const format = file.name.toLowerCase().endsWith(".csv") ? "csv"
                    : file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
      const res = await parseFn({ data: { filename: file.name, format, base64: b64 } });
      return { ...res, filename: file.name, format } as ParsedFile;
    },
    onSuccess: (p) => setParsed(p),
    onError: (e) => toast.error(`Lecture impossible : ${(e as Error).message}`),
  });

  const mCommit = useMutation({
    mutationFn: () => commitFn({
      data: {
        filename: parsed!.filename,
        file_format: parsed!.format,
        rows: parsed!.rows,
        dedupe_strategy: dedupe,
      },
    }),
    onSuccess: (r) => {
      toast.success(`Import OK — ${r.inserted} créés, ${r.updated} mis à jour, ${r.skipped} ignorés${r.errors ? `, ${r.errors} erreurs` : ""}`);
      qc.invalidateQueries({ queryKey: ["iptv"] });
      setParsed(null);
    },
    onError: (e) => toast.error(`Import échoué : ${(e as Error).message}`),
  });

  if (!parsed) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-medium mb-1">Import IPTV — format MEGAOTT</h3>
            <p className="text-sm text-muted-foreground">
              Glissez l'export MEGAOTT (CSV, XLS ou XLSX). Les colonnes sont reconnues automatiquement,
              les doublons détectés par <b>Username</b>.
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
            <p className="text-sm">Glissez-déposez votre fichier MEGAOTT, ou cliquez pour parcourir</p>
            <p className="text-xs text-muted-foreground mt-1">.csv, .xls, .xlsx</p>
            <input
              ref={fileRef} type="file" hidden
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) mParse.mutate(f); }}
            />
          </div>
          {mParse.isPending && <p className="text-sm text-muted-foreground">Analyse en cours…</p>}

          <div className="border-t pt-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Colonnes MEGAOTT reconnues</div>
            <div className="flex flex-wrap gap-1.5">
              {MEGAOTT_COLUMNS.map(c => <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{parsed.filename}</span>
          <Badge variant="outline">{parsed.totalRows} lignes</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />{Object.keys(mapping).length} colonnes détectées
          </Badge>
          {missingColumns.length > 0 && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />{missingColumns.length} colonnes manquantes
            </Badge>
          )}
        </div>

        {missingColumns.length > 0 && (
          <div className="text-xs text-amber-700 bg-amber-500/10 rounded p-2">
            Non trouvées : {missingColumns.join(", ")} — l'import continue avec les colonnes disponibles.
          </div>
        )}

        {!mapping.username && (
          <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-3">
            Colonne <b>Username</b> introuvable — vérifiez que le fichier provient bien d'un export MEGAOTT.
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">En cas de doublon (même Username)</Label>
            <Select value={dedupe} onValueChange={(v) => setDedupe(v as "skip" | "update")}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Mettre à jour les infos</SelectItem>
                <SelectItem value="skip">Ignorer les existants</SelectItem>
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
                {PREVIEW_FIELDS.filter(f => mapping[f.key]).map(f => (
                  <TableHead key={f.key} className="whitespace-nowrap">{f.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.sample.map((row, i) => (
                <TableRow key={i}>
                  {PREVIEW_FIELDS.filter(f => mapping[f.key]).map(f => {
                    const v = row[mapping[f.key]!];
                    return (
                      <TableCell key={f.key} className="text-xs whitespace-nowrap max-w-[240px] truncate">
                        {v != null && v !== "" ? String(v) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={() => setParsed(null)}>
            <ArrowLeft className="h-3 w-3 mr-1" /> Changer de fichier
          </Button>
          <Button onClick={() => mCommit.mutate()} disabled={!mapping.username || mCommit.isPending}>
            {mCommit.isPending ? "Import…" : `Importer ${parsed.totalRows} abonnements`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}