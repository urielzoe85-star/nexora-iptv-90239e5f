// Server functions — module Bots (admin only).
// Contrôle Telegram : statut, setup webhook, broadcast, notifications admin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const getBotsStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const hasLovable = Boolean(process.env.LOVABLE_API_KEY);
    const hasTelegram = Boolean(process.env.TELEGRAM_API_KEY);
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? null;

    let bot: any = null;
    let webhook: any = null;
    let error: string | null = null;
    if (hasLovable && hasTelegram) {
      try {
        const { getBotInfo, getWebhookInfo } = await import("@/lib/telegram.server");
        const [b, w] = await Promise.all([getBotInfo(), getWebhookInfo()]);
        bot = b?.result ?? null;
        webhook = w?.result ?? null;
      } catch (e: any) {
        error = e?.message ?? String(e);
      }
    }

    // Compte les clients contactables Telegram
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { count } = await supabaseAdmin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .not("metadata->>telegram_chat_id", "is", null);

    return {
      configured: hasLovable && hasTelegram,
      adminChatConfigured: Boolean(adminChatId),
      bot,
      webhook,
      subscribers: count ?? 0,
      error,
    };
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