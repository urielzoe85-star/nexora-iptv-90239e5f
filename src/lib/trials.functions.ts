import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TrialInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  contact: z.string().trim().max(60).optional().default(""),
  channel: z.enum(["whatsapp", "telegram", "email"]).default("whatsapp"),
  device: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  // honeypot — must be empty
  website: z.string().max(0).optional().default(""),
});

export const requestFreeTrial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TrialInput.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // silent honeypot
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate-limit: 1 trial request per email / 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    let customerId = existingCustomer?.id as string | undefined;

    if (customerId) {
      const { data: recent } = await supabaseAdmin
        .from("trials")
        .select("id, created_at")
        .eq("customer_id", customerId)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        return { ok: true, duplicate: true };
      }
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("customers")
        .insert({
          email: data.email,
          phone: data.contact || null,
          country: data.country || null,
          metadata: { source: "essai-gratuit", channel: data.channel, device: data.device },
        })
        .select("id")
        .single();
      if (error || !created) throw new Error("Impossible d'enregistrer votre demande.");
      customerId = created.id;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("trials").insert({
      customer_id: customerId!,
      status: "pending",
      expires_at: expiresAt,
      notes: `Demande via /essai-gratuit — canal préféré: ${data.channel}${data.contact ? " (" + data.contact + ")" : ""}${data.device ? " — appareil: " + data.device : ""}${data.country ? " — pays: " + data.country : ""}`,
      metadata: {
        source: "landing_essai_gratuit",
        contact: data.contact,
        channel: data.channel,
        device: data.device,
        country: data.country,
      },
    });

    // Notify admin via Telegram (best-effort; ignore failures so the user still gets confirmation)
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (botToken && chatId) {
        const text = [
          "🎁 *Nouvelle demande d'essai gratuit 24h*",
          `Email : ${data.email}`,
          data.contact ? `Contact (${data.channel}) : ${data.contact}` : `Canal : ${data.channel}`,
          data.device ? `Appareil : ${data.device}` : "",
          data.country ? `Pays : ${data.country}` : "",
          "",
          "→ NCC · Essais gratuits",
        ].filter(Boolean).join("\n");
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
        });
      }
    } catch {}

    return { ok: true };
  });