// Serveur — client Meta WhatsApp Cloud API.
import { errorMessage } from "@/lib/error-message";
// Import uniquement côté serveur (server functions, routes API, actions).
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const GRAPH_VERSION = "v21.0";

function creds() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp non configuré (WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant)");
  }
  return { phoneNumberId, token };
}

/** Normalise un numéro E.164 sans le "+" (format Meta Cloud API). */
export function normalizeWaNumber(raw: string): string {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

async function noteAuthFailure(status: number) {
  if (status !== 401 && status !== 403) return;
  try {
    const { noteSecretInvalid } = await import("@/lib/secret-guard.server");
    await noteSecretInvalid("WHATSAPP_ACCESS_TOKEN", { route: "whatsapp.cloud_api" }, `HTTP ${status}`);
  } catch {
    // secret-guard optionnel — ignorer si indisponible
  }
}

async function waCall(path: string, body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  data: any;
  error?: string;
  messageId?: string;
}> {
  const { phoneNumberId, token } = creds();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  const ok = res.ok && !data?.error;
  if (!ok) await noteAuthFailure(res.status);
  const errMsg = ok
    ? undefined
    : data?.error?.message
      ? `[${data.error.code ?? res.status}${data.error.error_subcode ? "/" + data.error.error_subcode : ""}] ${data.error.message}${data.error.error_data?.details ? ` — ${data.error.error_data.details}` : ""}`
      : `HTTP ${res.status}`;
  return {
    ok,
    status: res.status,
    data,
    error: errMsg,
    messageId: data?.messages?.[0]?.id,
  };
}

/**
 * Envoie un message texte libre (uniquement dans la fenêtre 24h après
 * dernier message client). Hors fenêtre, Meta refuse et il faut un template.
 */
export async function sendWhatsAppText(to: string, body: string) {
  const phone = normalizeWaNumber(to);
  if (!phone || phone.length < 8) {
    return { ok: false, status: 0, data: null, error: `invalid_phone (${to})` } as const;
  }
  return waCall("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: { preview_url: false, body },
  });
}

/**
 * Envoie un template pré-approuvé Meta (utilisé pour initier une
 * conversation ou reprendre contact hors fenêtre 24h).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
) {
  const phone = normalizeWaNumber(to);
  if (!phone) return { ok: false, status: 0, data: null, error: "phone_missing" } as const;
  return waCall("messages", {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && components.length ? { components } : {}),
    },
  });
}

/** Alerte silencieuse vers l'admin (fallback si Telegram indisponible). */
export async function notifyAdminWhatsApp(text: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;
    if (!adminPhone) return { sent: false, reason: "WHATSAPP_ADMIN_PHONE non défini" };
    const res = await sendWhatsAppText(adminPhone, text);
    return res.ok ? { sent: true } : { sent: false, reason: res.error };
  } catch (e: unknown) {
    return { sent: false, reason: errorMessage(e) ?? "erreur inconnue" };
  }
}