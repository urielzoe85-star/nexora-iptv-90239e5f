// Serveur — utilitaires Telegram partagés (gateway Lovable + BotFather).
// Importer uniquement côté serveur (server functions, routes API, actions).

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

function creds() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error("Telegram non configuré (LOVABLE_API_KEY ou TELEGRAM_API_KEY manquant)");
  }
  return { LOVABLE_API_KEY, TELEGRAM_API_KEY };
}

async function tgCall(method: string, body: Record<string, unknown>): Promise<any> {
  const { LOVABLE_API_KEY, TELEGRAM_API_KEY } = creds();
  const res = await fetch(`${GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
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
    await tgSendMessage(chatId, text);
    return { sent: true };
  } catch (e: any) {
    console.warn("[telegram] notifyAdmin failed:", e?.message ?? e);
    return { sent: false, reason: e?.message ?? "erreur inconnue" };
  }
}

/** Récupère les infos du webhook Telegram enregistré. */
export async function getWebhookInfo(): Promise<any> {
  const { LOVABLE_API_KEY, TELEGRAM_API_KEY } = creds();
  const res = await fetch(`${GATEWAY}/getWebhookInfo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  return res.json();
}

/** Récupère les infos du bot (getMe). */
export async function getBotInfo(): Promise<any> {
  const { LOVABLE_API_KEY, TELEGRAM_API_KEY } = creds();
  const res = await fetch(`${GATEWAY}/getMe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  return res.json();
}

/** Enregistre le webhook (secret dérivé de TELEGRAM_API_KEY, cf. route publique). */
export async function setWebhook(url: string): Promise<any> {
  const { createHash } = await import("crypto");
  const secret_token = createHash("sha256")
    .update(`telegram-webhook:${process.env.TELEGRAM_API_KEY}`)
    .digest("base64url");
  return tgCall("setWebhook", {
    url,
    secret_token,
    allowed_updates: ["message", "edited_message"],
  });
}