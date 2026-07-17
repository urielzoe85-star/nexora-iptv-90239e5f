// Notification channel abstraction. Adding a real channel = implement
// send() and register it here. The NotificationService persists every
// dispatch in the `notifications` table regardless of the channel.

import type { NotificationChannel } from "@/domain/types";

export interface NotificationDispatchInput {
  recipient: string;
  subject?: string | null;
  body?: string | null;
  payload?: Record<string, unknown>;
}

export interface NotificationDispatchResult {
  status: "sent" | "failed";
  error?: string;
  providerReference?: string;
}

export interface NotificationChannelAdapter {
  readonly id: NotificationChannel;
  readonly label: string;
  readonly enabled: boolean;
  send(input: NotificationDispatchInput): Promise<NotificationDispatchResult>;
}

class StubChannel implements NotificationChannelAdapter {
  constructor(public readonly id: NotificationChannel, public readonly label: string) {}
  readonly enabled = false;
  async send(): Promise<NotificationDispatchResult> {
    return { status: "failed", error: "channel_not_implemented" };
  }
}

class EmailChannel implements NotificationChannelAdapter {
  readonly id: NotificationChannel = "email";
  readonly label = "Email";
  readonly enabled = true;
  async send(input: NotificationDispatchInput): Promise<NotificationDispatchResult> {
    try {
      const to = (input.recipient || "").trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return { status: "failed", error: "invalid_email" };
      }
      const subject = (input.subject && input.subject.trim()) || "Notification Nexora";
      const bodyText = (input.body ?? "").trim();
      if (!bodyText) return { status: "failed", error: "empty_body" };
      const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
<div style="max-width:560px;margin:24px auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
<h2 style="margin:0 0 12px">${escape(subject)}</h2>
<div style="white-space:pre-wrap">${escape(bodyText)}</div>
</div></body></html>`;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as any;

      const { data: suppressed } = await sb
        .from("suppressed_emails").select("id").eq("email", to.toLowerCase()).maybeSingle();
      if (suppressed) return { status: "failed", error: "recipient_suppressed" };

      const messageId = crypto.randomUUID();
      await sb.from("email_send_log").insert({
        message_id: messageId,
        template_name: "ncc-notification",
        recipient_email: to,
        status: "pending",
      });
      const { error } = await sb.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to,
          from: "Nexora IPTV <noreply@send.nexora-iptv.com>",
          sender_domain: "send.nexora-iptv.com",
          subject,
          html,
          text: bodyText,
          purpose: "transactional",
          label: "ncc-notification",
          idempotency_key: `ncc-notif-${messageId}`,
          queued_at: new Date().toISOString(),
        },
      });
      if (error) return { status: "failed", error: error.message };
      try { await sb.rpc("email_queue_dispatch"); }
      catch (e: any) { console.warn("email_queue_dispatch wake failed", e?.message ?? e); }
      return { status: "sent", providerReference: messageId };
    } catch (e: any) {
      return { status: "failed", error: e?.message ?? String(e) };
    }
  }
}

class TelegramChannel implements NotificationChannelAdapter {
  readonly id: NotificationChannel = "telegram";
  readonly label = "Telegram";
  get enabled() {
    if (typeof process === "undefined" || !process.env) return false;
    return Boolean(process.env.LOVABLE_API_KEY && process.env.TELEGRAM_API_KEY);
  }
  async send(input: NotificationDispatchInput): Promise<NotificationDispatchResult> {
    try {
      const text = [input.subject, input.body].filter(Boolean).join("\n\n").trim();
      if (!text) return { status: "failed", error: "empty_body" };
      const chatId = (input.recipient || "").trim();
      if (!chatId) return { status: "failed", error: "missing_chat_id" };
      const { tgSendMessage } = await import("@/lib/telegram.server");
      await tgSendMessage(chatId, text);
      return { status: "sent" };
    } catch (e: any) {
      return { status: "failed", error: e?.message ?? String(e) };
    }
  }
}

class WhatsAppChannel implements NotificationChannelAdapter {
  readonly id: NotificationChannel = "whatsapp";
  readonly label = "WhatsApp";
  get enabled() {
    if (typeof process === "undefined" || !process.env) return false;
    return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  }
  async send(input: NotificationDispatchInput): Promise<NotificationDispatchResult> {
    try {
      const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
      const body = input.body ?? input.subject ?? "";
      if (!body) return { status: "failed", error: "empty_body" };
      const res = await sendWhatsAppText(input.recipient, body);
      return res.ok
        ? { status: "sent", providerReference: res.messageId }
        : { status: "failed", error: res.error ?? `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: "failed", error: e?.message ?? String(e) };
    }
  }
}

export const NOTIFICATION_CHANNELS_REGISTRY: Record<NotificationChannel, NotificationChannelAdapter> = {
  email:    new EmailChannel(),
  whatsapp: new WhatsAppChannel(),
  telegram: new TelegramChannel(),
  sms:      new StubChannel("sms",      "SMS"),
  in_app:   new StubChannel("in_app",   "Notification interne"),
};

export const NOTIFICATION_CHANNEL_LIST: NotificationChannelAdapter[] =
  Object.values(NOTIFICATION_CHANNELS_REGISTRY);

export function getNotificationChannel(id: NotificationChannel): NotificationChannelAdapter {
  const c = NOTIFICATION_CHANNELS_REGISTRY[id];
  if (!c) throw new Error(`Unknown notification channel: ${id}`);
  return c;
}