"use client";

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { decideActionRequest, listActionRequests } from "@/lib/ai-chat/approvals.functions";

const STATUS: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "En attente", className: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Clock },
  approved: { label: "Approuvé", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  executed: { label: "Exécuté", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: ShieldCheck },
  rejected: { label: "Rejeté", className: "bg-red-500/15 text-red-500 border-red-500/30", icon: XCircle },
  failed: { label: "Échec", className: "bg-red-500/15 text-red-500 border-red-500/30", icon: AlertTriangle },
};

export function ApprovalsView() {
  const qc = useQueryClient();
  const listFn = useServerFn(listActionRequests);
  const decideFn = useServerFn(decideActionRequest);
  const [filter, setFilter] = useState<string>("pending");

  const q = useQuery({
    queryKey: ["ncc-ai-approvals", filter],
    queryFn: () => listFn({ data: filter === "all" ? {} : { status: filter } }),
    refetchInterval: 15_000,
  });

  const decide = useMutation({
    mutationFn: (v: { requestId: string; decision: "approved" | "rejected"; note?: string }) =>
      decideFn({ data: v }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ncc-ai-approvals"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["pending", "executed", "rejected", "failed", "all"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition",
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 hover:bg-muted/40",
            )}
          >
            {s === "all" ? "Tous" : STATUS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Chargement…</div>}
      <div className="space-y-2">
        {(q.data?.requests ?? []).map((r: any) => {
          const meta = STATUS[r.status] ?? { label: r.status, className: "", icon: Clock };
          const Icon = meta.icon;
          return (
            <div key={r.id} className="border border-border rounded-lg p-4 bg-card/40">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
                      <Icon className="h-3 w-3 mr-1" /> {meta.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase">{r.scope}</span>
                    <code className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{r.tool}</code>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="text-sm mt-2">{r.summary}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Demandé par : {r.requested_by_email ?? r.requested_by_label ?? "—"}
                  </div>
                  {r.args && Object.keys(r.args).length > 0 && (
                    <details className="mt-2 text-[11px]">
                      <summary className="cursor-pointer text-muted-foreground">Paramètres</summary>
                      <pre className="bg-muted/40 rounded p-2 mt-1 overflow-auto max-h-40">{JSON.stringify(r.args, null, 2)}</pre>
                    </details>
                  )}
                  {r.result && (
                    <details className="mt-2 text-[11px]">
                      <summary className="cursor-pointer text-muted-foreground">Résultat</summary>
                      <pre className="bg-muted/40 rounded p-2 mt-1 overflow-auto max-h-40">{JSON.stringify(r.result, null, 2)}</pre>
                    </details>
                  )}
                  {r.error && <div className="text-xs text-red-500 mt-2">{r.error}</div>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() =>
                      decide.mutate({ requestId: r.id, decision: "rejected", note: "Rejeté par l'admin" })
                    } disabled={decide.isPending}>
                      <XCircle className="h-3 w-3 mr-1" /> Rejeter
                    </Button>
                    <Button size="sm" onClick={() =>
                      decide.mutate({ requestId: r.id, decision: "approved" })
                    } disabled={decide.isPending}>
                      {decide.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Approuver
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {(q.data?.requests ?? []).length === 0 && !q.isLoading && (
          <div className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg p-8 text-center">
            Aucune demande {filter !== "all" ? `avec le statut "${STATUS[filter]?.label ?? filter}"` : ""}.
          </div>
        )}
      </div>
    </div>
  );
}