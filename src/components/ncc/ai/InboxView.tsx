"use client";

import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Headset, Clock, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { listHandoffThreads } from "@/lib/ai-chat/handoff.functions";

const STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: "🆘 Demande", className: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
  human: { label: "👤 En cours", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40" },
  ai: { label: "🤖 IA", className: "bg-muted text-muted-foreground border-border" },
  closed: { label: "Fermé", className: "bg-muted text-muted-foreground border-border" },
};

export function InboxView() {
  const qc = useQueryClient();
  const listFn = useServerFn(listHandoffThreads);
  const q = useQuery({
    queryKey: ["ncc-ai-inbox"],
    queryFn: () => listFn({ data: {} }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("ncc-ai-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_chat_threads" },
        () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const threads = q.data?.threads ?? [];
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Headset className="h-3 w-3" /> Conversations visiteurs — priorité aux demandes d'humain.
      </div>
      {q.isLoading && <div className="text-sm text-muted-foreground">Chargement…</div>}
      {!q.isLoading && threads.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
          Aucune conversation visiteur pour le moment.
        </div>
      )}
      <ul className="space-y-2">
        {threads.map((t: any) => {
          const s = STATUS[t.handoff_status] ?? STATUS.ai;
          return (
            <li key={t.id}>
              <Link
                to="/ncc/ai/inbox/$threadId"
                params={{ threadId: t.id }}
                className="block border border-border rounded-lg p-3 bg-card/40 hover:bg-card transition"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px]", s.className)}>{s.label}</Badge>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {t.title ?? "Visiteur"}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(t.last_message_at ?? t.updated_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {(() => { try { return t.visitor_meta?.referer ? new URL(t.visitor_meta.referer).pathname : "—"; } catch { return "—"; } })()}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}