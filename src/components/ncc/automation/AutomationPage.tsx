import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listWorkflows, toggleWorkflow, runWorkflowManually,
  listRuns, getRun, replayRunFn, getAutomationKpis,
  getAutomationHealth, adminDrainQueueNow, adminRetryFailedJobs, adminForceAttributeOrder,
} from "@/lib/automation.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Play, RefreshCw, Loader2, Zap, RotateCcw, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

function statusColor(s: string) {
  switch (s) {
    case "success": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "failed": return "bg-red-500/15 text-red-600 border-red-500/30";
    case "running": return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    case "cancelled": return "bg-zinc-500/15 text-zinc-600 border-zinc-500/30";
    default: return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  }
}

export function AutomationPage() {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList>
        <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
        <TabsTrigger value="workflows">Workflows</TabsTrigger>
        <TabsTrigger value="history">Historique</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard" className="mt-6"><AutomationKpis /></TabsContent>
      <TabsContent value="workflows" className="mt-6"><WorkflowsList /></TabsContent>
      <TabsContent value="history" className="mt-6"><RunsHistory /></TabsContent>
    </Tabs>
  );
}

function AutomationKpis() {
  const fn = useServerFn(getAutomationKpis);
  const { data, isLoading } = useQuery({ queryKey: ["automation", "kpis"], queryFn: () => fn() });
  const items = [
    { label: "Workflows actifs", value: data?.activeWorkflows ?? 0 },
    { label: "Exécutions (24h)", value: data?.runs24h ?? 0 },
    { label: "Erreurs (24h)", value: data?.errors24h ?? 0 },
    { label: "En file d'attente", value: data?.queued ?? 0 },
    { label: "Durée moyenne", value: data ? `${data.avgDurationMs} ms` : "—" },
  ];
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-semibold mt-2">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <QueueHealthCard />
    </div>
  );
}

function QueueHealthCard() {
  const qc = useQueryClient();
  const healthFn = useServerFn(getAutomationHealth);
  const drainFn = useServerFn(adminDrainQueueNow);
  const retryFn = useServerFn(adminRetryFailedJobs);
  const forceFn = useServerFn(adminForceAttributeOrder);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["automation", "health"],
    queryFn: () => healthFn(),
    refetchInterval: 5_000,
  });

  const drain = useMutation({
    mutationFn: () => drainFn(),
    onSuccess: (r: any) => {
      toast.success(`File drainée`, {
        description: `${r.processed?.length ?? 0} job(s) traité(s), ${r.reclaimed ?? 0} rattrapé(s).`,
      });
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (e: any) => toast.error("Drainage échoué", { description: String(e?.message ?? e) }),
  });
  const retry = useMutation({
    mutationFn: () => retryFn({ data: { maxAgeHours: 24 } }),
    onSuccess: (r: any) => {
      toast.success(`${r.requeued ?? 0} job(s) remis en file`);
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (e: any) => toast.error("Requeue échoué", { description: String(e?.message ?? e) }),
  });
  const [orderRef, setOrderRef] = useState("");
  const force = useMutation({
    mutationFn: () => forceFn({ data: { orderRef: orderRef.trim().toUpperCase() } }),
    onSuccess: (r: any) => {
      if (r.status === "success") toast.success(`Attribution forcée : run ${r.status}`);
      else toast.error(`Attribution ${r.status}`, { description: r.error ?? undefined });
      setOrderRef("");
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (e: any) => toast.error("Attribution échouée", { description: String(e?.message ?? e) }),
  });

  const oldestSec = data?.oldestQueuedAgeSec ?? 0;
  const oldestBadge =
    oldestSec === 0 ? { text: "aucun", cls: "text-muted-foreground" } :
    oldestSec > 300 ? { text: `${Math.round(oldestSec / 60)} min`, cls: "text-red-500 font-semibold" } :
    oldestSec > 60 ? { text: `${Math.round(oldestSec / 60)} min`, cls: "text-amber-500" } :
    { text: `${oldestSec}s`, cls: "text-emerald-500" };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Santé de la file
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Diagnostic temps-réel — rafraîchi toutes les 5 s. Utilisez les actions ci-dessous en cas d'attribution IPTV bloquée.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Queued" value={data?.queued ?? 0} tone={(data?.queued ?? 0) > 5 ? "warn" : "ok"} />
            <Stat label="Processing" value={data?.processing ?? 0} tone={(data?.stuckProcessing ?? 0) > 0 ? "warn" : "ok"} />
            <Stat label="Failed" value={data?.failed ?? 0} tone={(data?.failed ?? 0) > 0 ? "warn" : "ok"} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Plus vieux queued</div>
              <div className={"text-2xl font-semibold mt-1 " + oldestBadge.cls}>{oldestBadge.text}</div>
            </div>
          </div>
        )}
        {(data?.stuckProcessing ?? 0) > 0 && (
          <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              {data!.stuckProcessing} job(s) coincé(s) en <code>processing</code> depuis &gt; 5 min. Ils seront remis en file au prochain drain.
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => drain.mutate()} disabled={drain.isPending}>
            {drain.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Drainer maintenant
          </Button>
          <Button size="sm" variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
            {retry.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Réessayer les failed (24h)
          </Button>
        </div>
        <div className="border-t border-border/60 pt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Forcer l'attribution IPTV d'une commande
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="NX-XXXXXXXXXX"
              className="max-w-[220px] font-mono text-xs uppercase"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!orderRef.trim() || force.isPending}
              onClick={() => force.mutate()}
            >
              {force.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Attribuer maintenant
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Exécute synchronement le workflow <code>payment-confirmed</code> pour la commande — utilisez quand la file est bloquée ou pour renvoyer la fiche IPTV.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-2xl font-semibold mt-1 " + (tone === "warn" ? "text-amber-500" : "")}>{value}</div>
    </div>
  );
}

function WorkflowsList() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWorkflows);
  const toggleFn = useServerFn(toggleWorkflow);
  const { data, isLoading } = useQuery({ queryKey: ["automation", "workflows"], queryFn: () => listFn() });
  const toggle = useMutation({
    mutationFn: (vars: { key: string; enabled: boolean }) => toggleFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation", "workflows"] }),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  return (
    <div className="grid gap-4">
      {(data ?? []).map((w) => (
        <Card key={w.key}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{w.name}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                <code className="font-mono">{w.key}</code> · déclencheur <Badge variant="secondary">{w.trigger_event}</Badge> · {w.steps} étape(s)
              </div>
              {w.description && <p className="text-sm text-muted-foreground mt-2">{w.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Switch checked={w.enabled} onCheckedChange={(v) => toggle.mutate({ key: w.key, enabled: v })} />
              <RunDialog workflowKey={w.key} />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function RunDialog({ workflowKey }: { workflowKey: string }) {
  const qc = useQueryClient();
  const runFn = useServerFn(runWorkflowManually);
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("{}");
  const m = useMutation({
    mutationFn: () => {
      let payload: Record<string, unknown> = {};
      try { payload = JSON.parse(json || "{}"); } catch { throw new Error("JSON invalide"); }
      return runFn({ data: { key: workflowKey, payload } });
    },
    onSuccess: (r) => {
      toast.success(`Run ${r.status}`, { description: r.error ?? `runId: ${r.runId.slice(0, 8)}…` });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (e: any) => toast.error("Échec", { description: String(e?.message ?? e) }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" /> Exécuter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exécuter « {workflowKey} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Payload JSON</label>
          <Textarea value={json} onChange={(e) => setJson(e.target.value)} rows={8} className="font-mono text-xs" />
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Lancer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunsHistory() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRuns);
  const replayFn = useServerFn(replayRunFn);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["automation", "runs"], queryFn: () => listFn({ data: {} }) });
  const replay = useMutation({
    mutationFn: (id: string) => replayFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Replay ${r.status}`, { description: r.error ?? undefined });
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (e: any) => toast.error("Replay échoué", { description: String(e?.message ?? e) }),
  });
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="ghost" onClick={() => refetch()}><RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="px-4 py-2">Workflow</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Durée</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Erreur</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{r.workflow_key}</td>
                  <td className="px-4 py-2"><span className={"inline-block px-2 py-0.5 rounded border text-xs " + statusColor(r.status)}>{r.status}</span></td>
                  <td className="px-4 py-2">{r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs text-red-600 max-w-[260px] truncate" title={r.error ?? ""}>{r.error ?? ""}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r.id)}>Détails</Button>
                      {r.status === "failed" && (
                        <Button size="sm" variant="outline" onClick={() => replay.mutate(r.id)} disabled={replay.isPending}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Replay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune exécution.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {selected && <RunDetailsDialog id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RunDetailsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const fn = useServerFn(getRun);
  const { data } = useQuery({ queryKey: ["automation", "run", id], queryFn: () => fn({ data: { id } }) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Détails du run</DialogTitle></DialogHeader>
        {!data ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="text-xs text-muted-foreground">
              <div><strong>Workflow :</strong> {data.run?.workflow_key}</div>
              <div><strong>Statut :</strong> {data.run?.status}</div>
              <div><strong>Trigger :</strong> {data.run?.trigger_event ?? "—"}</div>
            </div>
            <div className="space-y-2">
              {data.steps.map((s: any) => (
                <div key={s.id} className="border border-border/60 rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono">#{s.step_index} {s.name}</span>
                    <span className={"px-2 rounded " + statusColor(s.status)}>{s.status}</span>
                  </div>
                  {s.error && <div className="text-red-600 mt-1">{s.error}</div>}
                  {s.output && <pre className="mt-1 text-[10px] bg-muted/40 p-1 rounded overflow-auto">{JSON.stringify(s.output, null, 2)}</pre>}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}