"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { X, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiAssistant } from "@/lib/ai-assistant";
import { supabase } from "@/integrations/supabase/client";
import nexoraAiLogo from "@/assets/nexora-ai-logo.png";
import {
  Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

function newSessionId() {
  return "web-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

type HandoffStatus = "ai" | "requested" | "human" | "closed";

export function NexoraAssistantWidget() {
  const open = useSyncExternalStore(
    aiAssistant.subscribe,
    aiAssistant.isOpen,
    () => false,
  );
  const setOpen = (v: boolean) => aiAssistant.set(v);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem("nxa-sid");
    if (existing) return existing;
    const s = newSessionId();
    localStorage.setItem("nxa-sid", s);
    return s;
  }, []);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffStatus>("ai");
  const [bootstrapped, setBootstrapped] = useState(false);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/public/ai/chat/visitor",
      body: () => ({ sessionId }),
    }),
  ).current;

  const { messages, setMessages, sendMessage, status } = useChat({
    id: "nexora-web-assistant",
    transport,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  // Bootstrap: fetch persisted threadId + history + handoff status on first open.
  useEffect(() => {
    if (!open || bootstrapped || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/ai/chat/visitor/bootstrap", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          threadId: string; handoffStatus: HandoffStatus;
          messages: Array<{ id: string; role: string; parts: any; content: string }>;
        };
        if (cancelled) return;
        setThreadId(data.threadId);
        setHandoff(data.handoffStatus);
        if (data.messages?.length) {
          setMessages(data.messages.map((m) => ({
            id: m.id,
            role: m.role as any,
            parts: (Array.isArray(m.parts) && m.parts.length
              ? m.parts
              : [{ type: "text", text: m.content ?? "" }]) as any,
          })));
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, bootstrapped, sessionId, setMessages]);

  // Realtime: subscribe to new admin messages + handoff status changes.
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`nxa-thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          // Only append messages we don't already have (admin messages, or
          // reloads inserting rows the AI SDK already streamed).
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            // Skip visitor-echoed rows; useChat already tracks the user message locally.
            if (row.sender === "visitor") return prev;
            // Skip assistant AI rows if we already have an assistant turn with the same text
            // (avoids duplicating the streamed AI answer).
            if (row.sender === "assistant") {
              const last = prev[prev.length - 1];
              const lastText = last && last.role === "assistant"
                ? (last.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
                : "";
              if (lastText && lastText.trim() === String(row.content ?? "").trim()) return prev;
            }
            return [...prev, {
              id: row.id,
              role: row.role,
              parts: (Array.isArray(row.parts) && row.parts.length
                ? row.parts
                : [{ type: "text", text: row.content ?? "" }]) as any,
            }];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_chat_threads", filter: `id=eq.${threadId}` },
        (payload: any) => {
          const s = payload?.new?.handoff_status as HandoffStatus | undefined;
          if (s) setHandoff(s);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, setMessages]);

  const banner =
    handoff === "requested"
      ? { text: "Un conseiller Nexora est en train de rejoindre la conversation…", tone: "amber" as const }
      : handoff === "human"
        ? { text: "Un conseiller Nexora est en ligne avec toi.", tone: "emerald" as const }
        : null;

  return (
    <>
      {open && (
        <div className="fixed bottom-28 right-4 z-[70] w-[92vw] max-w-sm h-[70vh] max-h-[560px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <img
                src={nexoraAiLogo}
                alt="Nexora AI"
                className="h-8 w-8 rounded-full object-contain bg-primary/10 p-0.5"
              />
              <div>
                <div className="text-sm font-semibold">Nexora Assistant</div>
                <div className="text-[10px] text-muted-foreground">
                  {handoff === "human" ? "Conseiller humain — en ligne" : "IA officielle — en ligne"}
                </div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {banner && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-[11px] border-b border-border/60",
                banner.tone === "amber" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                banner.tone === "emerald" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              )}
            >
              <Headset className="h-3.5 w-3.5" />
              <span>{banner.text}</span>
            </div>
          )}

          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 && (
                <ConversationEmptyState
                  title="Bonjour 👋"
                  description="Je suis l'assistant Nexora. Pose-moi n'importe quelle question sur nos offres IPTV, l'installation, les paiements ou l'espace client."
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
                          <div key={i} className="text-[11px] text-muted-foreground italic">
                            🔧 {part.type.replace("tool-", "")}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <Shimmer>Nexora réfléchit…</Shimmer>}
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
              placeholder={handoff === "human" ? "Écris à ton conseiller…" : "Écris ton message…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={busy || !input.trim()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      )}
    </>
  );
}