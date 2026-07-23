"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Plus, Trash2, MessagesSquare, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  createThread, deleteThread, getThreadMessages, listMyThreads,
} from "@/lib/ai-chat/threads.functions";

export function CopilotView() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const getMessagesFn = useServerFn(getThreadMessages);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const threadsQ = useQuery({ queryKey: ["ncc-ai-threads"], queryFn: () => listFn() });

  const create = useMutation({
    mutationFn: () => createFn({ data: { title: "Nouvelle conversation" } }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["ncc-ai-threads"] });
      setActiveId(row.id);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { threadId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ncc-ai-threads"] });
      setActiveId(null);
    },
  });

  const initialMessagesQ = useQuery({
    queryKey: ["ncc-ai-messages", activeId],
    queryFn: async () => {
      if (!activeId) return { messages: [] as UIMessage[] };
      const r = await getMessagesFn({ data: { threadId: activeId } });
      const msgs: UIMessage[] = (r.messages ?? []).map((row: any) => ({
        id: row.id,
        role: row.role,
        parts: Array.isArray(row.parts) && row.parts.length > 0
          ? row.parts
          : [{ type: "text", text: row.content ?? "" }],
      }));
      return { messages: msgs };
    },
    enabled: !!activeId,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-9rem)]">
      <aside className="border border-border rounded-lg bg-card/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center justify-between">
          <div className="text-sm font-semibold flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" /> Conversations
          </div>
          <Button size="sm" variant="secondary" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-3 w-3 mr-1" /> Nouveau
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {threadsQ.isLoading && <div className="text-xs text-muted-foreground p-2">Chargement…</div>}
          {(threadsQ.data?.threads ?? []).map((t: any) => (
            <div key={t.id} className={cn(
              "group flex items-center gap-1 rounded-md border border-transparent hover:border-border/60",
              activeId === t.id && "bg-primary/10 border-primary/30",
            )}>
              <button
                type="button"
                onClick={() => setActiveId(t.id)}
                className="flex-1 text-left px-3 py-2 text-xs truncate"
              >
                {t.title}
              </button>
              <button
                type="button"
                onClick={() => del.mutate(t.id)}
                className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {(threadsQ.data?.threads ?? []).length === 0 && !threadsQ.isLoading && (
            <div className="text-[11px] text-muted-foreground p-2">
              Aucune conversation. Clique sur "Nouveau" pour démarrer.
            </div>
          )}
        </div>
      </aside>

      <section className="border border-border rounded-lg bg-card/40 flex flex-col overflow-hidden">
        {!activeId ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground p-6 text-center">
            Sélectionne une conversation ou crée-en une nouvelle pour discuter avec le Copilote Nexora.
          </div>
        ) : !token ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : initialMessagesQ.isLoading ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <CopilotChat
            key={activeId}
            threadId={activeId}
            token={token}
            initialMessages={initialMessagesQ.data?.messages ?? []}
          />
        )}
      </section>
    </div>
  );
}

function CopilotChat({
  threadId, token, initialMessages,
}: { threadId: string; token: string; initialMessages: UIMessage[] }) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/ai/chat/ncc",
      headers: () => ({ Authorization: `Bearer ${token}` }),
      body: () => ({ threadId }),
    }),
    [threadId, token],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              title="Copilote Nexora"
              description="Demande-moi un aperçu business, cherche un client, prépare un message, ou lance une action (validation manuelle requise)."
            />
          )}
          {messages.map((m: UIMessage) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "assistant"
                      ? <MessageResponse key={i}>{part.text}</MessageResponse>
                      : <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                  }
                  if (part.type?.startsWith("tool-")) {
                    return (
                      <div key={i} className="text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2 my-1">
                        🔧 <code>{part.type.replace("tool-", "")}</code>
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Copilote réfléchit…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={(m) => {
          const text = m.text?.trim();
          if (!text || busy) return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <PromptInputTextarea
          placeholder="Ex: résume l'activité des 7 derniers jours et propose 3 actions."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} disabled={busy || !input.trim()} />
        </PromptInputFooter>
      </PromptInput>
    </>
  );
}