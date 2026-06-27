import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bug, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listIntegrationDebugLogs } from "@/lib/iptv-megaott.functions";
import { fmtDate } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/iptv/debug")({ component: DebugPage });

function DebugPage() {
  const list = useServerFn(listIntegrationDebugLogs);
  const q = useQuery({
    queryKey: ["integration_debug_logs", "iptv.megaott"],
    queryFn: () => list({ data: { connector_id: "iptv.megaott", limit: 200 } }),
  });
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-amber-500" />
          <h2 className="text-lg font-medium">API Debug — Integration Hub</h2>
          <Badge variant="outline">admin</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => q.refetch()}>
          <RefreshCcw className="h-3 w-3 mr-1" /> Rafraîchir
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Connector</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>OK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!q.isLoading && (q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Aucune trace pour le moment.</TableCell></TableRow>
              )}
              {(q.data ?? []).map((row: any) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(row)}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(row.created_at)}</TableCell>
                  <TableCell className="text-xs font-mono">{row.connector_id}</TableCell>
                  <TableCell className="text-xs">{row.operation ?? "—"}</TableCell>
                  <TableCell className="text-xs">{row.method}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[280px]">{row.url}</TableCell>
                  <TableCell className="text-xs">{row.status ?? "—"}</TableCell>
                  <TableCell className="text-xs">{row.duration_ms ?? 0} ms</TableCell>
                  <TableCell>
                    {row.ok
                      ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">ok</Badge>
                      : <Badge variant="outline" className="border-rose-500/40 text-rose-700">erreur</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">Détails de la requête</div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
            </div>
            <Field label="URL appelée" value={selected.url} mono />
            <Field label="Méthode" value={selected.method} />
            <Field label="Code HTTP" value={String(selected.status ?? "—")} />
            <Field label="Durée" value={`${selected.duration_ms ?? 0} ms (${selected.attempts ?? 1} tentative(s))`} />
            {selected.error && <Field label="Erreur" value={selected.error} />}
            <Block label="Headers (envoyés)" value={selected.request_headers} />
            <Block label="Body (envoyé)" value={selected.request_body} />
            <Block label="Réponse" value={selected.response_body} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value}</div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <div className="text-muted-foreground mb-1">{label}</div>
      <pre className="max-h-72 overflow-auto rounded bg-muted/50 p-2 text-xs">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}