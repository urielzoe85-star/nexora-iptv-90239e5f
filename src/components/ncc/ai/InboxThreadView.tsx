"use client";

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Send, Bot, User, Headset, ArrowLeft, XCircle, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  getHandoffThread, sendAdminMessage, takeOverHandoff, releaseHandoff,
} from "@/lib/ai-chat/handoff.functions";

export function InboxThreadView({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getHandoffThread);
  const sendFn = useServerFn(sendAdminMessage);
  const takeFn = useServerFn(takeOverHandoff);
  const releaseFn = useServerFn(releaseHandoff);

  const q = useQuery({
    queryKey: ["ncc-ai-inbox", threadId],
    queryFn: () => getFn({ data: { threadId } }),
  });

  useEffect(() => {
    const ch = supabase
      .channel(`ncc-inbox-${threadId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ai_chat_messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox", threadId] }))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_chat_threads", filter: `id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox", threadId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, threadId]);

  const send = useMutation({
    mutationFn: (text: string) => sendFn({ data: { threadId, text } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox", threadId] }),
  });
  const take = useMutation({
    mutationFn: () => takeFn({ data: { threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox", threadId] }),
  });
  const release = useMutation({
    mutationFn: (mode: "ai" | "closed") => releaseFn({ data: { threadId, mode } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncc-ai-inbox", threadId] }),
  });

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [q.data?.messages?.length]);

  if (q.isLoading || !q.data) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  const th = q.data.thread as any;
  const msgs = q.data.messages as any[];
  const status = th.handoff_status as string;
  const meta = th.visitor_meta ?? {};

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px] border border-border rounded-lg overflow-hidden bg-card/30">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap bg-background/50">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/ncc/ai/inbox" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{th.title ?? "Visiteur"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {meta.referer ?? "—"} · {meta.language ?? ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {status === "requested" && "🆘 Demande d'humain"}
            {status === "human" && "👤 Toi en ligne"}
            {status === "ai" && "🤖 Piloté par l'IA"}
            {status === "closed" && "Fermé"}
          </Badge>
          {status !== "human" && (
            <Button size="sm" onClick={() => take.mutate()} disabled={take.isPending}>
              <Headset className="h-3.5 w-3.5 mr-1" /> Prendre la conversation
            </Button>
          )}
          {status === "human" && (
            <>
              <Button size="sm" variant="outline" onClick={() => release.mutate("ai")} disabled={release.isPending}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rendre à l'IA
              </Button>
              <Button size="sm" variant="ghost" onClick={() => release.mutate("closed")} disabled={release.isPending}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Clôturer
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">Aucun message.</div>
        )}
        {msgs.map((m) => {
          const isVisitor = m.role === "user" || m.sender === "visitor";
          const isAdmin = m.sender === "admin";
          return (
            <div key={m.id} className={cn("flex gap-2", isVisitor ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                isVisitor && "bg-muted",
                !isVisitor && isAdmin && "bg-primary text-primary-foreground",
                !isVisitor && !isAdmin && "bg-primary/10 border border-primary/20",
              )}>
                <div className="text-[10px] opacity-70 mb-1 flex items-center gap-1">
                  {isVisitor ? <><User className="h-3 w-3" /> Visiteur</> :
                    isAdmin ? <><Headset className="h-3 w-3" /> Admin</> :
                    <><Bot className="h-3 w-3" /> IA</>}
                  <span>· {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {m.content ?? ""}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="border-t border-border/60 p-3 flex gap-2 bg-background/50"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          send.mutate(t);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={status === "human" ? "Réponds au visiteur…" : "Écris pour prendre la main…"}
          className="flex-1 bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" size="sm" disabled={send.isPending || !text.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" /> Envoyer
        </Button>
      </form>
    </div>
  );
}