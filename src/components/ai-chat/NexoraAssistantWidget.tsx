"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function NexoraAssistantWidget() {
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<string>(typeof window !== "undefined" ? sessionStorage.getItem("nxa-sid") ?? newSessionId() : "");
  useEffect(() => {
    if (typeof window !== "undefined" && sessionRef.current) sessionStorage.setItem("nxa-sid", sessionRef.current);
  }, []);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/public/ai/chat/visitor",
      body: () => ({ sessionId: sessionRef.current }),
    }),
  ).current;

  const { messages, sendMessage, status } = useChat({ id: "nexora-web-assistant", transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Nexora Assistant"
        className={cn(
          "fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-2xl",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "grid place-items-center transition-transform hover:scale-105",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-40 right-4 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 grid place-items-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">Nexora Assistant</div>
                <div className="text-[10px] text-muted-foreground">IA officielle — en ligne</div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

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
              placeholder="Écris ton message…"
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