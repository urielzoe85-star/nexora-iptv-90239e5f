import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listIptvLogs } from "@/lib/iptv.functions";
import { listImportBatches } from "@/lib/iptv-import.functions";
import { fmtDate } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/iptv/history")({ component: HistoryPage });

function HistoryPage() {
  const logsFn = useServerFn(listIptvLogs);
  const batchesFn = useServerFn(listImportBatches);
  const logs = useQuery({ queryKey: ["iptv", "logs"], queryFn: () => logsFn({ data: {} }) });
  const batches = useQuery({ queryKey: ["iptv", "import-batches"], queryFn: () => batchesFn() });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">Imports IPTV</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Quand</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Lignes</TableHead>
              <TableHead className="text-right">Créés</TableHead>
              <TableHead className="text-right">MAJ</TableHead>
              <TableHead className="text-right">Ignorés</TableHead>
              <TableHead className="text-right">Erreurs</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {batches.isLoading && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!batches.isLoading && (batches.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Aucun import.</TableCell></TableRow>
              )}
              {(batches.data ?? []).map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(b.created_at)}</TableCell>
                  <TableCell className="text-sm">{b.filename}</TableCell>
                  <TableCell><Badge variant="outline">{b.file_format}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{b.row_count}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-600">{b.inserted_count}</TableCell>
                  <TableCell className="text-right text-sm">{b.updated_count}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{b.skipped_count}</TableCell>
                  <TableCell className="text-right text-sm text-red-600">{b.error_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">Événements IPTV</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Quand</TableHead><TableHead>Action</TableHead>
              <TableHead>Fournisseur</TableHead><TableHead>Message</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.isLoading && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!logs.isLoading && (logs.data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Aucun événement.</TableCell></TableRow>}
              {(logs.data ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.iptv_providers?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{l.message ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}