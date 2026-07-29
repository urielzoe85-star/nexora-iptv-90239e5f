// Notification channel abstraction. Adding a real channel = implement
// send() and register it here. The NotificationService persists every
// dispatch in the `notifications` table regardless of the channel.

import type { NotificationChannel } from "@/domain/types";
import { errorMessage } from "@/lib/error-message";

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

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as any;

      const { data: suppressed } = await sb
        .from("suppressed_emails").select("id").eq("email", to.toLowerCase()).maybeSingle();
      if (suppressed) return { status: "failed", error: "recipient_suppressed" };

      const { getOrCreateUnsubscribeToken } = await import("@/lib/email-unsubscribe.server");
      let unsubscribeToken: string;
      try {
        unsubscribeToken = await getOrCreateUnsubscribeToken(to);
      } catch (e: unknown) {
        return { status: "failed", error: errorMessage(e) ?? "unsubscribe_token_error" };
      }

      const messageId = crypto.randomUUID();

      // Rendu avec le gabarit de marque (en-tête navy/or + signature + désabonnement)
      const React = (await import("react")).default;
      const { render } = await import("react-email");
      const { template: nccTemplate } = await import("@/lib/email-templates/ncc-notification");
      const element = React.createElement(nccTemplate.component, {
        subject,
        body: bodyText,
        unsubscribe_token: unsubscribeToken,
      });
      const html = await render(element);
      const plainText = await render(element, { plainText: true });

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
          text: plainText,
          purpose: "transactional",
          label: "ncc-notification",
          idempotency_key: `ncc-notif-${messageId}`,
          unsubscribe_token: unsubscribeToken,
          queued_at: new Date().toISOString(),
        },
      });
      if (error) return { status: "failed", error: error.message };
      try { await sb.rpc("email_queue_dispatch"); }
      catch (e: unknown) { console.warn("email_queue_dispatch wake failed", errorMessage(e) ?? e); }
      return { status: "sent", providerReference: messageId };
    } catch (e: unknown) {
      return { status: "failed", error: errorMessage(e) ?? String(e) };
    }
  }
}

class TelegramChannel implements NotificationChannelAdapter {
  readonly id: NotificationChannel = "telegram";
  readonly label = "Telegram";
  get enabled() {
    if (typeof process === "undefined" || !process.env) return false;
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
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
    } catch (e: unknown) {
      return { status: "failed", error: errorMessage(e) ?? String(e) };
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
    } catch (e: unknown) {
      return { status: "failed", error: errorMessage(e) ?? String(e) };
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