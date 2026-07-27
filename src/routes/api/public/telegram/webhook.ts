import { createFileRoute } from "@tanstack/react-router";

const HELP_TEXT = [
  "🤖 *Nexora IPTV Bot*",
  "",
  "Commandes disponibles :",
  "• /start <référence> — lier votre chat à une commande",
  "• /status <référence> — consulter le statut d'une commande",
  "• /help — afficher cette aide",
  "",
  "Support : contact@nexora-iptv.com",
  "Site : https://nexora-iptv.com",
].join("\n");

async function deriveSecret(apiKey: string) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`telegram-webhook:${apiKey}`),
  );
  const bytes = String.fromCharCode(...new Uint8Array(digest));
  return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function tgSend(chatId: number | string, text: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, parse_mode: "Markdown" }),
    });
  } catch { /* swallow — webhook must always 200 */ }
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!TELEGRAM_BOT_TOKEN) return new Response("Not configured", { status: 503 });

        const expected = await deriveSecret(TELEGRAM_BOT_TOKEN);
        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const message = update?.message ?? update?.edited_message;
        const chatId = message?.chat?.id;
        const text: string | undefined = message?.text;
        if (!chatId) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");

        // /start <order_ref> — bind chat to customer
        const startMatch = text?.match(/^\/start(?:\s+(\S+))?/i);
        if (startMatch) {
          const payload = startMatch[1]?.trim();
          const tgUsername = message?.from?.username ? `@${message.from.username}` : null;

          if (payload) {
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("id, customer_id, order_ref, email")
              .eq("order_ref", payload)
              .maybeSingle();

            if (order?.customer_id) {
              const { data: cust } = await supabaseAdmin
                .from("customers").select("metadata").eq("id", order.customer_id).maybeSingle();
              const meta = { ...(cust?.metadata as any ?? {}), telegram_chat_id: chatId, telegram_username: tgUsername };
              await supabaseAdmin.from("customers").update({ metadata: meta }).eq("id", order.customer_id);
              await tgSend(chatId, `✅ Compte lié à la commande ${order.order_ref}.\nVous recevrez vos accès IPTV ici dès activation.`);
              return Response.json({ ok: true, linked: true });
            }
            await tgSend(chatId, `Commande "${payload}" introuvable. Vérifiez la référence reçue par email.`);
            return Response.json({ ok: true, linked: false });
          }

          await tgSend(
            chatId,
            "👋 Bienvenue sur Nexora IPTV !\n\nPour recevoir vos accès via Telegram, ouvrez le lien envoyé après votre commande (format : t.me/NexoraIPTVBot?start=VOTRE_REF).",
          );
          return Response.json({ ok: true });
        }

        if (text?.match(/^\/help/i)) {
          await tgSend(chatId, HELP_TEXT);
          return Response.json({ ok: true });
        }

        // /status <ref> — statut public d'une commande
        const statusMatch = text?.match(/^\/status(?:\s+(\S+))?/i);
        if (statusMatch) {
          const ref = statusMatch[1]?.trim();
          if (!ref) {
            await tgSend(chatId, "Usage : /status VOTRE_REFERENCE");
            return Response.json({ ok: true });
          }
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("order_ref, status, plan_name, amount, currency, created_at, metadata")
            .eq("order_ref", ref)
            .maybeSingle();
          if (!order) {
            await tgSend(chatId, `❌ Commande *${ref}* introuvable.`);
            return Response.json({ ok: true });
          }
          const delivery = (order.metadata as any)?.iptv_delivery ?? null;
          const delivered = delivery?.delivery_status === "sent";
          const lines = [
            `📦 *Commande ${order.order_ref}*`,
            `Plan : ${order.plan_name}`,
            `Montant : ${order.amount} ${order.currency}`,
            `Statut : \`${order.status}\``,
            delivered ? "✅ Accès IPTV envoyés" : "⏳ Livraison en cours",
            "",
            `🔎 Suivi complet : https://nexora-iptv.com/track?ref=${encodeURIComponent(order.order_ref)}`,
          ];
          await tgSend(chatId, lines.join("\n"));
          return Response.json({ ok: true });
        }

        // Fallback pour message inconnu
        if (text?.startsWith("/")) {
          await tgSend(chatId, HELP_TEXT);
        }
        return Response.json({ ok: true });
      },
    },
  },
});