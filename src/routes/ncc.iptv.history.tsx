import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listIptvLogs } from "@/lib/iptv.functions";
import { fmtDate } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/iptv/history")({ component: HistoryPage });

function HistoryPage() {
  const fn = useServerFn(listIptvLogs);
  const q = useQuery({ queryKey: ["iptv", "logs"], queryFn: () => fn({ data: {} }) });
  return (
    <Card><CardContent className="pt-6">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Quand</TableHead><TableHead>Action</TableHead>
          <TableHead>Fournisseur</TableHead><TableHead>Message</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {q.isLoading && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
          {!q.isLoading && (q.data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Aucun événement.</TableCell></TableRow>}
          {(q.data ?? []).map((l: any) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
              <TableCell className="font-mono text-xs">{l.action}</TableCell>
              <TableCell className="text-sm">{l.iptv_providers?.name ?? "—"}</TableCell>
              <TableCell className="text-sm">{l.message ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}