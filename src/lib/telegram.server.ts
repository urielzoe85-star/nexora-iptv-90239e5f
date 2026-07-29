// Serveur — utilitaires Telegram partagés (Bot API directe).
import { errorMessage } from "@/lib/error-message";
// Importer uniquement côté serveur (server functions, routes API, actions).

function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Telegram non configuré (TELEGRAM_BOT_TOKEN manquant)");
  return t;
}

async function tgCall(method: string, body: Record<string, unknown>): Promise<any> {
  const token = botToken();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(`Telegram ${method} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function tgSendMessage(chatId: number | string, text: string, opts?: { parse_mode?: "HTML" | "Markdown" }): Promise<void> {
  await tgCall("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(opts?.parse_mode ? { parse_mode: opts.parse_mode } : {}),
  });
}

/** Alerte silencieuse vers le chat admin. Ne throw jamais (best-effort). */
export async function notifyAdminTelegram(text: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) return { sent: false, reason: "TELEGRAM_ADMIN_CHAT_ID non défini" };
    if (!/^-?\d+$/.test(chatId.trim())) {
      return {
        sent: false,
        reason: `TELEGRAM_ADMIN_CHAT_ID doit être un chat_id numérique (reçu: « ${chatId} »). Écris /start à ton bot pour l'obtenir.`,
      };
    }
    await tgSendMessage(chatId, text);
    return { sent: true };
  } catch (e: unknown) {
    console.warn("[telegram] notifyAdmin failed:", errorMessage(e) ?? e);
    return { sent: false, reason: errorMessage(e) ?? "erreur inconnue" };
  }
}

/** Récupère les infos du webhook Telegram enregistré. */
export async function getWebhookInfo(): Promise<any> {
  return tgCall("getWebhookInfo", {});
}

/** Récupère les infos du bot (getMe). */
export async function getBotInfo(): Promise<any> {
  return tgCall("getMe", {});
}

/** Enregistre le webhook (secret dérivé de TELEGRAM_BOT_TOKEN, cf. route publique). */
export async function setWebhook(url: string): Promise<any> {
  const { createHash } = await import("crypto");
  const secret_token = createHash("sha256")
    .update(`telegram-webhook:${botToken()}`)
    .digest("base64url");
  return tgCall("setWebhook", {
    url,
    secret_token,
    allowed_updates: ["message", "edited_message"],
  });
}