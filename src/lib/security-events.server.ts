// Sprint 2 / Bloc D — helper d'audit sécurité.
// Insère un événement dans `public.security_events` (service_role) et
// pousse une alerte Telegram pour les sévérités `warn` / `critical` quand
// la variable `SECURITY_ALERT_TELEGRAM_CHAT_ID` est configurée.
//
// Server-only : NE JAMAIS importer depuis un composant React ou un fichier
// `*.functions.ts` au top-level. À charger via `await import(...)`.

export type SecuritySeverity = "info" | "warn" | "critical";

export interface SecurityEventInput {
  event_type: string;
  severity?: SecuritySeverity;
  actor_user_id?: string | null;
  actor_email?: string | null;
  target_user_id?: string | null;
  request_id?: string | null;
  route?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  message: string;
  payload?: Record<string, unknown>;
}

function redact(value: string | null | undefined, keep = 3): string | null {
  if (!value) return value ?? null;
  if (value.length <= keep) return "***";
  return value.slice(0, keep) + "***";
}

async function sendTelegramAlert(
  chatId: string,
  evt: SecurityEventInput,
): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;

  const emoji = evt.severity === "critical" ? "🚨" : "⚠️";
  const lines = [
    `${emoji} <b>NEXORA security</b> — <code>${evt.event_type}</code>`,
    `<b>Sévérité :</b> ${evt.severity ?? "info"}`,
    evt.route ? `<b>Route :</b> <code>${evt.route}</code>` : null,
    evt.actor_email ? `<b>Acteur :</b> ${redact(evt.actor_email, 3)}` : null,
    evt.ip ? `<b>IP :</b> <code>${redact(evt.ip, 6)}</code>` : null,
    "",
    evt.message.slice(0, 400),
  ].filter(Boolean);

  try {
    await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.warn("[security-events] telegram alert failed:", (err as Error).message);
  }
}

/**
 * Enregistre un événement de sécurité. Ne throw jamais : l'audit ne doit
 * pas casser le flux fonctionnel (le caller a déjà pris sa décision).
 */
export async function recordSecurityEvent(evt: SecurityEventInput): Promise<void> {
  const severity: SecuritySeverity = evt.severity ?? "info";
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("security_events").insert({
      event_type: evt.event_type,
      severity,
      actor_user_id: evt.actor_user_id ?? null,
      actor_email: evt.actor_email ?? null,
      target_user_id: evt.target_user_id ?? null,
      request_id: evt.request_id ?? null,
      route: evt.route ?? null,
      ip: evt.ip ?? null,
      user_agent: evt.user_agent ?? null,
      message: evt.message,
      payload: (evt.payload ?? {}) as never,
    });
    if (error) {
      console.error("[security-events] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[security-events] insert threw:", (err as Error).message);
  }

  if (severity === "warn" || severity === "critical") {
    const chatId = process.env.SECURITY_ALERT_TELEGRAM_CHAT_ID;
    if (chatId) {
      await sendTelegramAlert(chatId, { ...evt, severity });
    }
  }
}

/** Extrait IP + user-agent d'une Request pour les webhooks/routes publiques. */
export function extractRequestMeta(
  request: Request,
): { ip: string | null; user_agent: string | null; request_id: string } {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const user_agent = request.headers.get("user-agent") ?? null;
  // Prefer an upstream-supplied correlation id so a single incident can be
  // followed across CDN / reverse-proxy / app logs; otherwise mint one.
  const request_id =
    request.headers.get("cf-ray") ??
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    (globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`);
  return { ip, user_agent, request_id };
}

/** Generates a short correlation id for server functions that have no Request. */
export function newRequestId(prefix = "srv"): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now().toString(36)}`;
}