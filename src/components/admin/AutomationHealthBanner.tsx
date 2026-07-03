import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getAutomationHealth, adminDrainQueueNow } from "@/lib/automation.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Zap, ExternalLink } from "lucide-react";

export function AutomationHealthBanner() {
  const qc = useQueryClient();
  const healthFn = useServerFn(getAutomationHealth);
  const drainFn = useServerFn(adminDrainQueueNow);
  const { data } = useQuery({
    queryKey: ["automation", "health"],
    queryFn: () => healthFn(),
    refetchInterval: 10_000,
  });

  const drain = useMutation({
    mutationFn: () => drainFn(),
    onSuccess: (r: any) => {
      toast.success("File drainée", {
        description: `${r.processed?.length ?? 0} job(s) traité(s), ${r.reclaimed ?? 0} rattrapé(s).`,
      });
      qc.invalidateQueries({ queryKey: ["automation"] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: any) => toast.error("Drainage échoué", { description: String(e?.message ?? e) }),
  });

  if (!data) return null;
  const queued = data.queued ?? 0;
  const stuck = data.stuckProcessing ?? 0;
  const failed = data.failed ?? 0;
  const oldestSec = data.oldestQueuedAgeSec ?? 0;

  const shouldShow = stuck > 0 || failed > 0 || (queued > 0 && oldestSec > 120);
  if (!shouldShow) return null;

  const parts: string[] = [];
  if (queued > 0) parts.push(`${queued} en file`);
  if (stuck > 0) parts.push(`${stuck} bloqué(s)`);
  if (failed > 0) parts.push(`${failed} en échec`);

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1 text-sm text-amber-900 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Automation IPTV — {parts.join(" · ")}</div>
          {oldestSec > 0 && (
            <div className="text-xs opacity-80">
              Plus vieux job en attente depuis {oldestSec > 60 ? `${Math.round(oldestSec / 60)} min` : `${oldestSec}s`}.
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={() => drain.mutate()} disabled={drain.isPending}>
          {drain.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
          Drainer maintenant
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/ncc/automation">
            <ExternalLink className="h-4 w-4 mr-2" /> Tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}