import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { MessagingChannel, MessagingConnector } from "./types";

function stub(id: string, label: string, channel: MessagingChannel): MessagingConnector {
  return {
    id, type: "messaging", label, status: "stub", channel,
    isReady() { return false; },
    async send() {
      return err(integrationError("not_implemented", `${label} is not implemented yet`, { connectorId: id }));
    },
  };
}

export const whatsappBusinessConnector = stub("messaging.whatsapp_business", "WhatsApp Business", "whatsapp");
export const telegramBotConnector      = stub("messaging.telegram_bot",      "Telegram Bot",      "telegram");
export const smsConnector              = stub("messaging.sms",               "SMS",               "sms");
export const inAppConnector            = stub("messaging.in_app",            "Notifications internes", "in_app");