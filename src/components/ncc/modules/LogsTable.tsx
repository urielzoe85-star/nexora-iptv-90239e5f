import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollText, RefreshCw, Download } from "lucide-react";
import { getSystemLogs, type LogRow } from "@/lib/logs.functions";

const sevColors: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-500 border-sky-500/20",
  warn: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  error: "bg-red-500/15 text-red-500 border-red-500/20",
  critical: "bg-red-600/20 text-red-600 border-red-600/30",
};

export function LogsTable() {
  const fn = useServerFn(getSystemLogs);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"all" | "info" | "warn" | "error">("all");
  const [source, setSource] = useState<"all" | "security" | "automation" | "iptv">("all");

  const q = useQuery({
    queryKey: ["ncc", "logs", severity, source],
    queryFn: () => fn({ data: { severity, source, limit: 300 } }),
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => {
    const list = (q.data as LogRow[] | undefined) ?? [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((r) =>
      r.message.toLowerCase().includes(s) || (r.actor ?? "").toLowerCase().includes(s) || (r.ref ?? "").toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const exportCsv = () => {
    const header = "ts,severity,source,message,actor,ref\n";
    const body = rows.map((r) =>
      [r.ts, r.severity, r.source, r.message, r.actor ?? "", r.ref ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nexora-logs-${new Date().toISOString()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/60">
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Rechercher dans les évènements…" className="flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error / Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(v) => setSource(v as any)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              <SelectItem value="security">Sécurité</SelectItem>
              <SelectItem value="automation">Automation</SelectItem>
              <SelectItem value="iptv">IPTV</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Date</TableHead>
                <TableHead className="w-24">Niveau</TableHead>
                <TableHead className="w-28">Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-48">Acteur / Réf</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun évènement.</p>
                  </TableCell>
                </TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r.ts}-${i}`}>
                  <TableCell className="text-xs font-mono">{new Date(r.ts).toLocaleString("fr-FR")}</TableCell>
                  <TableCell><Badge variant="outline" className={sevColors[r.severity] ?? ""}>{r.severity}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{r.source}</Badge></TableCell>
                  <TableCell className="text-sm max-w-xl truncate" title={r.message}>{r.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[12rem]" title={`${r.actor ?? ""} ${r.ref ?? ""}`}>
                    {r.actor ?? ""}{r.actor && r.ref ? " · " : ""}{r.ref ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
