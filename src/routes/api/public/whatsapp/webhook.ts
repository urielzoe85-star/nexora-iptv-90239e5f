import { createFileRoute } from "@tanstack/react-router";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleInbound(update: any) {
  // Meta payload : entry[].changes[].value.{messages,statuses,contacts}
  const entries = Array.isArray(update?.entry) ? update.entry : [];
  if (!entries.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const ch of changes) {
      const value = ch?.value ?? {};
      const contacts: any[] = Array.isArray(value.contacts) ? value.contacts : [];
      const messages: any[] = Array.isArray(value.messages) ? value.messages : [];
      const statuses: any[] = Array.isArray(value.statuses) ? value.statuses : [];

      // 1) Statuts de livraison (sent/delivered/read/failed) → tracer.
      for (const st of statuses) {
        try {
          await sb.from("delivery_logs").insert({
            channel: "whatsapp",
            status: st.status === "failed" ? "failed" : "sent",
            template_id: "whatsapp-status",
            content: `status=${st.status} wa_id=${st.id ?? ""}`,
            recipient: String(st.recipient_id ?? ""),
            error: st.errors?.[0]?.title ?? null,
          });
        } catch {
          // best-effort
        }
      }

      // 2) Messages entrants → support_tickets + support_messages.
      for (const msg of messages) {
        try {
          const from: string = String(msg.from ?? "");
          if (!from) continue;
          const contact = contacts.find((c) => c?.wa_id === from);
          const displayName = contact?.profile?.name ?? from;
          const body = extractText(msg);

          // Cherche un client via téléphone.
          const phone = "+" + from.replace(/[^\d]/g, "");
          const { data: customer } = await sb
            .from("customers")
            .select("id, email, full_name")
            .or(`phone.eq.${phone},phone.eq.${from}`)
            .maybeSingle();

          const email = customer?.email ?? `whatsapp+${from}@nexora.internal`;
          const subject = `WhatsApp — ${displayName}`;

          // Ticket ouvert existant pour ce numéro ?
          const { data: existing } = await sb
            .from("support_tickets")
            .select("id")
            .eq("email", email)
            .in("status", ["open", "pending"])
            .order("last_message_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let ticketId = existing?.id as string | undefined;
          if (!ticketId) {
            const { data: created, error } = await sb
              .from("support_tickets")
              .insert({
                email,
                subject,
                customer_id: customer?.id ?? null,
                status: "open",
                priority: "normal",
                last_message_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (error) throw error;
            ticketId = created.id;
          } else {
            await sb.from("support_tickets")
              .update({ last_message_at: new Date().toISOString(), status: "open" })
              .eq("id", ticketId);
          }

          await sb.from("support_messages").insert({
            ticket_id: ticketId,
            author_type: "customer",
            body: body || `[${msg.type ?? "message"}]`,
          });

          // Notification admin (best-effort).
          try {
            const { notifyAdminTelegram } = await import("@/lib/telegram.server");
            await notifyAdminTelegram(
              `💬 WhatsApp de ${displayName} (${phone})\n${(body || `[${msg.type}]`).slice(0, 400)}`,
            );
          } catch {
            // best-effort
          }
        } catch (e) {
          console.warn("[whatsapp.webhook] inbound message error:", (e as any)?.message ?? e);
        }
      }
    }
  }
}

function extractText(msg: any): string {
  if (!msg) return "";
  switch (msg.type) {
    case "text":         return msg.text?.body ?? "";
    case "button":       return msg.button?.text ?? "";
    case "interactive":  return msg.interactive?.button_reply?.title
                            ?? msg.interactive?.list_reply?.title ?? "";
    case "image":        return msg.image?.caption ?? "[image]";
    case "video":        return msg.video?.caption ?? "[vidéo]";
    case "audio":        return "[audio]";
    case "document":     return msg.document?.filename ?? "[document]";
    case "location":     return `[localisation ${msg.location?.latitude},${msg.location?.longitude}]`;
    default:             return `[${msg.type ?? "message"}]`;
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      // Meta verification handshake
      GET: async ({ request }) => {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        if (!verifyToken) return new Response("Not configured", { status: 503 });

        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";

        if (mode === "subscribe" && token && safeEqual(token, verifyToken)) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Event delivery
      POST: async ({ request }) => {
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (!appSecret) return new Response("Not configured", { status: 503 });

        const rawBody = await request.text();
        const header = request.headers.get("x-hub-signature-256") ?? "";
        const provided = header.startsWith("sha256=") ? header.slice(7) : header;
        const expected = await hmacHex(appSecret, rawBody);

        if (!provided || !safeEqual(provided.toLowerCase(), expected.toLowerCase())) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const update = JSON.parse(rawBody);
          await handleInbound(update);
        } catch (e) {
          // ignore parse errors — répondre 200 quoi qu'il arrive
          console.warn("[whatsapp.webhook] handle error:", (e as any)?.message ?? e);
        }

        return Response.json({ ok: true });
      },
    },
  },
});