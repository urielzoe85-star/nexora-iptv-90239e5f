// Server functions — module Bots (admin only).
// Contrôle Telegram : statut, setup webhook, broadcast, notifications admin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { errorMessage } from "@/lib/error-message";

export const getBotsStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const hasTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? null;

    let bot: any = null;
    let webhook: any = null;
    let error: string | null = null;
    if (hasTelegram) {
      try {
        const { getBotInfo, getWebhookInfo } = await import("@/lib/telegram.server");
        const [b, w] = await Promise.all([getBotInfo(), getWebhookInfo()]);
        bot = b?.result ?? null;
        webhook = w?.result ?? null;
      } catch (e: unknown) {
        error = errorMessage(e) ?? String(e);
      }
    }

    // Compte les clients contactables Telegram
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { count } = await supabaseAdmin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .not("metadata->>telegram_chat_id", "is", null);

    const adminChatIsNumeric = adminChatId ? /^-?\d+$/.test(adminChatId.trim()) : false;

    return {
      configured: hasTelegram,
      adminChatConfigured: Boolean(adminChatId),
      adminChatIsNumeric,
      bot,
      webhook,
      subscribers: count ?? 0,
      error,
    };
  });

// ── WhatsApp Cloud API diagnostics ──────────────────────────────────────────
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
    const hasToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE ?? null;
    const configured = Boolean(phoneNumberId && hasToken);

    let phone: any = null;
    let error: string | null = null;
    if (configured) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`,
          { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } },
        );
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok || body?.error) {
          error = body?.errorMessage(error)
            ? `[${body.error.code ?? res.status}] ${body.error.message}`
            : `HTTP ${res.status}`;
          if (res.status === 401 || res.status === 403) {
            try {
              const { noteSecretInvalid } = await import("@/lib/secret-guard.server");
              await noteSecretInvalid("WHATSAPP_ACCESS_TOKEN", { route: "bots.status" }, error);
            } catch { /* optional */ }
          }
        } else {
          phone = body;
        }
      } catch (e: unknown) {
        error = errorMessage(e) ?? String(e);
      }
    }

    return {
      configured,
      phoneNumberId,
      adminPhoneConfigured: Boolean(adminPhone),
      phone,
      error,
    };
  });

export const testAdminWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { notifyAdminWhatsApp } = await import("@/lib/whatsapp.server");
    return notifyAdminWhatsApp("🔔 Test Nexora — canal WhatsApp opérationnel.");
  });

export const setupTelegramWebhook = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { setWebhook } = await import("@/lib/telegram.server");
    const r = await setWebhook(data.url);
    return { ok: true, result: r?.result ?? r };
  });

export const broadcastTelegram = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      message: z.string().trim().min(2).max(3500),
      dryRun: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: rows, error } = await supabaseAdmin
      .from("customers")
      .select("id, metadata")
      .not("metadata->>telegram_chat_id", "is", null)
      .limit(2000);
    if (error) throw new Error(error.message);

    const targets = (rows ?? [])
      .map((r) => (r.metadata as any)?.telegram_chat_id)
      .filter((v: unknown): v is string | number => typeof v === "string" || typeof v === "number");

    if (data.dryRun) return { targeted: targets.length, sent: 0, failed: 0, dryRun: true };

    const { tgSendMessage } = await import("@/lib/telegram.server");
    let sent = 0, failed = 0;
    // Séquentiel avec petit délai pour respecter les limites Telegram (~30 msg/s).
    for (const chatId of targets) {
      try {
        await tgSendMessage(chatId, data.message);
        sent++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    return { targeted: targets.length, sent, failed };
  });

export const testAdminAlert = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { notifyAdminTelegram } = await import("@/lib/telegram.server");
    const r = await notifyAdminTelegram("🔔 Test d'alerte admin Nexora — le canal Telegram fonctionne.");
    return r;
  });