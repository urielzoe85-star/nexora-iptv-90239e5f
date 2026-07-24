import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { importAccountsCsv } from "@/lib/iptv.functions";

type Props = {
  account_type: "trial" | "premium";
  pkg: "24 Hours" | "1 Month" | "3 Months" | "6 Months" | "1 Year";
  label: string;
};

export function MegaottImportCard({ account_type, pkg, label }: Props) {
  const imp = useServerFn(importAccountsCsv);
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<null | { inserted: number; updated: number; skipped: number; errors: string[] }>(null);

  const mImport = useMutation({
    mutationFn: (v: { content: string; kind: "csv" | "xlsx" }) =>
      imp({ data: { ...v, account_type, package: pkg } }),
    onSuccess: (r) => {
      setReport(r as any);
      toast.success(`${r.inserted} nouveaux · ${r.updated} MAJ · ${r.skipped} rejetés`);
      qc.invalidateQueries({ queryKey: ["iptv"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Fichier > 5 Mo"); return; }
    const isSheet = /\.(xlsx|xls)$/i.test(file.name);
    if (isSheet) {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      mImport.mutate({ content: btoa(bin), kind: "xlsx" });
    } else {
      const text = await file.text();
      mImport.mutate({ content: text, kind: "csv" });
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import MegaOTT — {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Formats acceptés : <code>.csv</code> (séparateur <code>;</code>, format MegaOTT), <code>.xlsx</code>, <code>.xls</code>. Les fichiers dont la colonne <b>Package</b> ne correspond pas à <b>« {pkg} »</b> sont automatiquement rejetés. Anti-doublon : les <code>username</code> déjà en base sont mis à jour, jamais dupliqués.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
          />
          <Button size="sm" onClick={() => ref.current?.click()} disabled={mImport.isPending}>
            <Upload className="h-4 w-4 mr-1" /> {mImport.isPending ? "Import en cours…" : "Choisir un fichier"}
          </Button>
        </div>
        {report && (
          <div className="text-xs space-y-1 rounded-md border p-2 bg-muted/40">
            <div><b>{report.inserted}</b> nouveaux · <b>{report.updated}</b> mis à jour · <b>{report.skipped}</b> rejetés</div>
            {report.errors.length > 0 && (
              <details>
                <summary className="cursor-pointer text-muted-foreground">Voir les rejets ({report.errors.length})</summary>
                <ul className="mt-1 max-h-40 overflow-auto list-disc pl-4">
                  {report.errors.slice(0, 100).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}