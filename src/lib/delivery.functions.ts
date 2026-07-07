// Server functions pour la livraison des abonnements (WhatsApp / Telegram / Email).
// Semi-auto aujourd'hui : la couche UI ouvre le canal natif puis appelle
// logDelivery() pour tracer l'action. Les mêmes endpoints serviront demain
// à l'envoi automatique (WhatsApp Business / Bot Telegram / SMTP).

import { createServerFn } from "@tanstack/react-start";
import { requireNccUnlock } from "@/lib/require-ncc-unlock";
import { z } from "zod";

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

const ChannelEnum = z.enum(["whatsapp", "telegram", "email"]);
const StatusEnum = z.enum(["prepared", "copied", "sent", "automatic", "failed"]);

export const logDelivery = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      channel: ChannelEnum,
      status: StatusEnum,
      template_id: z.string().max(80).optional(),
      subject: z.string().max(500).optional(),
      content: z.string().min(1).max(20000),
      recipient: z.string().max(300).optional(),
      error: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const { data: order } = await sb.from("orders").select("id, customer_id").eq("id", data.order_id).maybeSingle();
    const { data: row, error } = await sb.from("delivery_logs").insert({
      order_id: data.order_id,
      customer_id: order?.customer_id ?? null,
      channel: data.channel,
      status: data.status,
      template_id: data.template_id ?? null,
      subject: data.subject ?? null,
      content: data.content,
      recipient: data.recipient ?? null,
      admin_id: context.userId,
      error: data.error ?? null,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDeliveryLogs = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid().optional(),
      channel: ChannelEnum.optional(),
      status: StatusEnum.optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    let q = sb.from("delivery_logs").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.order_id) q = q.eq("order_id", data.order_id);
    if (data.channel)  q = q.eq("channel", data.channel);
    if (data.status)   q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDeliveryStats = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows, error } = await sb
      .from("delivery_logs")
      .select("channel,status")
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const stats = {
      whatsapp: 0, telegram: 0, email: 0,
      copied: 0, sent: 0, automatic: 0, failed: 0,
      total: rows?.length ?? 0,
    };
    for (const r of rows ?? []) {
      if ((stats as any)[r.channel] !== undefined) (stats as any)[r.channel]++;
      if ((stats as any)[r.status]  !== undefined) (stats as any)[r.status]++;
    }
    return stats;
  });

// ────────────────────────────────────────────────────────────────────────────
// ENVOI AUTOMATIQUE — Telegram via gateway connector Lovable
// ────────────────────────────────────────────────────────────────────────────
export const sendTelegramAuto = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      chat_id: z.union([z.string(), z.number()]),
      text: z.string().min(1).max(4000),
      template_id: z.string().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      throw new Error("Telegram non configuré (LOVABLE_API_KEY ou TELEGRAM_API_KEY manquant)");
    }
    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: data.chat_id, text: data.text, disable_web_page_preview: true }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.ok && body?.ok !== false;
    const { data: order } = await sb.from("orders").select("customer_id").eq("id", data.order_id).maybeSingle();
    await sb.from("delivery_logs").insert({
      order_id: data.order_id,
      customer_id: order?.customer_id ?? null,
      channel: "telegram",
      status: ok ? "automatic" : "failed",
      template_id: data.template_id ?? null,
      content: data.text,
      recipient: String(data.chat_id),
      admin_id: context.userId,
      error: ok ? null : (body?.description ?? `HTTP ${res.status}`),
    });
    if (!ok) throw new Error(body?.description ?? `Telegram error ${res.status}`);
    return { ok: true, message_id: body?.result?.message_id };
  });

// ────────────────────────────────────────────────────────────────────────────
// ENVOI AUTOMATIQUE — WhatsApp Cloud API (Meta Business)
// ────────────────────────────────────────────────────────────────────────────
export const sendWhatsAppAuto = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      to: z.string().min(6).max(20),
      text: z.string().min(1).max(4000),
      template_id: z.string().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
      throw new Error("WhatsApp non configuré (WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant)");
    }
    const { sendWhatsAppText, normalizeWaNumber } = await import("@/lib/whatsapp.server");
    const res = await sendWhatsAppText(data.to, data.text);
    const { data: order } = await sb.from("orders").select("customer_id").eq("id", data.order_id).maybeSingle();
    await sb.from("delivery_logs").insert({
      order_id: data.order_id,
      customer_id: order?.customer_id ?? null,
      channel: "whatsapp",
      status: res.ok ? "automatic" : "failed",
      template_id: data.template_id ?? null,
      content: data.text,
      recipient: normalizeWaNumber(data.to),
      admin_id: context.userId,
      error: res.ok ? null : (res.error ?? `HTTP ${res.status}`),
    });
    if (!res.ok) throw new Error(res.error ?? `WhatsApp error ${res.status}`);
    return { ok: true, message_id: res.messageId };
  });

// ────────────────────────────────────────────────────────────────────────────
// ENVOI AUTOMATIQUE — Email via Lovable Emails (queue + retry)
// ────────────────────────────────────────────────────────────────────────────
export const sendEmailAuto = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      recipient: z.string().email(),
      subject: z.string().max(300).optional(),
      template_data: z.record(z.string(), z.any()).default({}),
      message_override: z.string().max(20000).optional(),
      template_id: z.string().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const React = await import("react");
    const { render } = await import("react-email");
    const { template } = await import("@/lib/email-templates/iptv-delivery");

    const messageId = crypto.randomUUID();
    const props = { ...data.template_data, message: data.message_override };
    let html = "", text = "";
    try {
      const el = React.createElement(template.component as any, props);
      html = await render(el);
      text = await render(el, { plainText: true });
    } catch (e: any) {
      await sb.from("delivery_logs").insert({
        order_id: data.order_id, channel: "email", status: "failed",
        template_id: data.template_id ?? "iptv-delivery", content: data.message_override ?? "",
        recipient: data.recipient, admin_id: context.userId,
        error: `render: ${e?.message ?? e}`,
      });
      throw new Error(`Render échoué: ${e?.message ?? e}`);
    }

    const subject = data.subject
      || (typeof template.subject === "function" ? template.subject(props) : template.subject);

    // Suppression check
    const { data: suppressed } = await sb
      .from("suppressed_emails").select("id").eq("email", data.recipient.toLowerCase()).maybeSingle();
    if (suppressed) {
      await sb.from("delivery_logs").insert({
        order_id: data.order_id, channel: "email", status: "failed",
        template_id: data.template_id ?? "iptv-delivery", content: data.message_override ?? "",
        recipient: data.recipient, admin_id: context.userId,
        error: "Adresse désabonnée / supprimée",
      });
      throw new Error("Cette adresse est désabonnée.");
    }

    await sb.from("email_send_log").insert({
      message_id: messageId, template_name: "iptv-delivery",
      recipient_email: data.recipient, status: "pending",
    });

    const { error: enqueueErr } = await sb.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: data.recipient,
        from: `nexora-iptv <noreply@nexora-iptv.com>`,
        sender_domain: "notify.nexora-iptv.com",
        subject,
        html, text,
        purpose: "transactional",
        label: "iptv-delivery",
        // Clé déterministe : un double-clic / retry n'enfile pas deux mails.
        // Un renvoi explicite (admin clique « Envoi automatique » à nouveau)
        // garde la même clé tant que la commande n'a pas changé d'identifiant
        // d'abonnement — c'est ce qu'on veut pour l'anti-duplication.
        idempotency_key: `iptv-delivery-${data.order_id}`,
        queued_at: new Date().toISOString(),
      },
    });

    const { data: order } = await sb.from("orders").select("customer_id").eq("id", data.order_id).maybeSingle();
    await sb.from("delivery_logs").insert({
      order_id: data.order_id,
      customer_id: order?.customer_id ?? null,
      channel: "email",
      status: enqueueErr ? "failed" : "automatic",
      template_id: data.template_id ?? "iptv-delivery",
      subject,
      content: data.message_override ?? subject,
      recipient: data.recipient,
      admin_id: context.userId,
      error: enqueueErr?.message ?? null,
    });

    if (enqueueErr) throw new Error(enqueueErr.message);
    return { ok: true, queued: true, message_id: messageId };
  });

// ────────────────────────────────────────────────────────────────────────────
// DISPATCH MULTI-CANAL — bouton "Envoyer maintenant" du NCC
// Utilise le même helper que le workflow payment-confirmed → parité garantie.
// ────────────────────────────────────────────────────────────────────────────
export const dispatchIptvDelivery = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      channels: z.array(z.enum(["email", "whatsapp", "telegram"])).optional(),
      force: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const { data: order } = await sb.from("orders").select("order_ref").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Commande introuvable");
    const { dispatchIptvDeliveryFor } = await import("@/lib/iptv-dispatch.server");
    return dispatchIptvDeliveryFor(order.order_ref, { channels: data.channels, force: data.force });
  });