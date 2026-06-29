import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(apiKey: string) {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function tgSend(chatId: number | string, text: string) {
  try {
    await fetch(`${GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch { /* swallow — webhook must always 200 */ }
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response("Not configured", { status: 503 });

        const expected = deriveSecret(TELEGRAM_API_KEY);
        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const message = update?.message ?? update?.edited_message;
        const chatId = message?.chat?.id;
        const text: string | undefined = message?.text;
        if (!chatId) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
          await tgSend(chatId, "Support Nexora IPTV : contact@nexora-iptv.com\nSite : https://nexora-iptv.com");
          return Response.json({ ok: true });
        }

        return Response.json({ ok: true });
      },
    },
  },
});