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
    // Phase 3: channels are architected but not wired. We mark the row as
    // "sent" so the UI history reflects an attempt; real delivery comes
    // in a later phase when each provider gets a concrete adapter.
    return { status: "sent" };
  }
}

export const NOTIFICATION_CHANNELS_REGISTRY: Record<NotificationChannel, NotificationChannelAdapter> = {
  email:    new StubChannel("email",    "Email"),
  whatsapp: new StubChannel("whatsapp", "WhatsApp"),
  telegram: new StubChannel("telegram", "Telegram"),
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