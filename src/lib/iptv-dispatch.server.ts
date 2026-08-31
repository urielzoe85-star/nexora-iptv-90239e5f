/* eslint-disable @typescript-eslint/no-explicit-any -- channel adapters accept JSON payloads. */
// ────────────────────────────────────────────────────────────────────────────
// Dispatch multi-canal de la fiche de livraison IPTV.
// Appelé par le workflow payment-confirmed ET par le bouton "Envoyer
// maintenant" du NCC. Ce module est côté serveur uniquement (client.server
// import + accès admin) — ne l'importez jamais depuis un composant.
// Idempotent : chaque canal est retenté indépendamment via channels_sent.
// ────────────────────────────────────────────────────────────────────────────

import {
  buildPlainTextDeliveryMessage,
  type IptvDelivery,
  type IptvDeliveryChannel,
} from "./iptv-delivery.builder";

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

type Outcome = { ok: boolean; skipped?: boolean; reason?: string; error?: string | null };

async function loadOrder(orderIdent: string) {
  const sb = await admin();
  // Accept ref (public NX-XXXX) or UUID.
  const byRef = await sb.from("orders").select("*").eq("order_ref", orderIdent).maybeSingle();
  if (byRef.data) return byRef.data;
  const byId = await sb.from("orders").select("*").eq("id", orderIdent).maybeSingle();
  return byId.data ?? null;
}

async function loadCustomer(customerId: string | null) {
  if (!customerId) return null;
  const sb = await admin();
  const { data } = await sb.from("customers").select("*").eq("id", customerId).maybeSingle();
  return data ?? null;
}

async function insertDeliveryLog(row: {
  order_id: string;
  customer_id: string | null;
  channel: IptvDeliveryChannel;
  status: "automatic" | "sent" | "failed" | "prepared";
  content: string;
  recipient: string | null;
  subject?: string | null;
  error?: string | null;
}) {
  const sb = await admin();
  await sb.from("delivery_logs").insert({
    order_id: row.order_id,
    customer_id: row.customer_id,
    channel: row.channel,
    status: row.status,
    template_id: "iptv-delivery",
    subject: row.subject ?? null,
    content: row.content,
    recipient: row.recipient,
    admin_id: null,
    error: row.error ?? null,
  });
}

async function sendEmailChannel(args: {
  order: any;
  delivery: IptvDelivery;
  text: string;
}): Promise<Outcome> {
  const recipient = args.order.email;
  if (!recipient) return { ok: false, skipped: true, reason: "email_missing" };
  const sb = await admin();
  const { data: suppressed } = await sb
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient.toLowerCase())
    .maybeSingle();
  if (suppressed) return { ok: false, skipped: true, reason: "suppressed" };

  try {
    const React = await import("react");
    const { render } = await import("react-email");
    const { template } = await import("@/lib/email-templates/iptv-delivery");
    const props = {
      client_name: args.order.full_name ?? recipient.split("@")[0],
      product_name: args.order.plan_name ?? args.delivery.package ?? "Abonnement IPTV",
      order_ref: args.order.order_ref ?? "",
      delivery: args.delivery,
    };
    const el = React.createElement(template.component as any, props);
    const html = await render(el);
    const text = await render(el, { plainText: true });
    const subject = `🎬 Vos accès IPTV — Nexora (${args.order.order_ref ?? "commande"})`;

    const messageId = crypto.randomUUID();
    await sb.from("email_send_log").insert({
      message_id: messageId,
      template_name: "iptv-delivery",
      recipient_email: recipient,
      status: "pending",
    });
    const { getOrCreateUnsubscribeToken } = await import("@/lib/email-unsubscribe.server");
    const unsubscribeToken = await getOrCreateUnsubscribeToken(recipient);
    const { error } = await sb.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: `Nexora IPTV <noreply@notify.account.nexora-iptv.com>`,
        sender_domain: "notify.account.nexora-iptv.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label: "iptv-delivery",
        idempotency_key: `iptv-delivery-auto-${args.order.id}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) throw new Error(error.message);
    try {
      await sb.rpc("email_queue_dispatch");
    } catch (wakeError) {
      console.warn("email_queue_dispatch wake failed", (wakeError as any)?.message ?? wakeError);
    }
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "email",
      status: "automatic",
      content: args.text,
      recipient,
      subject,
    });
    return { ok: true };
  } catch (e: any) {
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "email",
      status: "failed",
      content: args.text,
      recipient,
      error: e?.message ?? String(e),
    });
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function sendTelegramChannel(args: {
  order: any;
  customer: any;
  text: string;
}): Promise<Outcome> {
  const chatId = args.customer?.metadata?.telegram_chat_id;
  if (!chatId) return { ok: false, skipped: true, reason: "telegram_not_configured" };
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, skipped: true, reason: "telegram_credentials_missing" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: args.text, disable_web_page_preview: true }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.ok && body?.ok !== false;
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "telegram",
      status: ok ? "automatic" : "failed",
      content: args.text,
      recipient: String(chatId),
      error: ok ? null : (body?.description ?? `HTTP ${res.status}`),
    });
    return ok ? { ok: true } : { ok: false, error: body?.description ?? `HTTP ${res.status}` };
  } catch (e: any) {
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "telegram",
      status: "failed",
      content: args.text,
      recipient: String(chatId),
      error: e?.message ?? String(e),
    });
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function sendWhatsAppChannel(args: {
  order: any;
  customer: any;
  text: string;
}): Promise<Outcome> {
  const phone =
    args.customer?.phone ?? args.order.phone ?? args.order?.metadata?.momo?.phone ?? null;
  if (!phone) return { ok: false, skipped: true, reason: "whatsapp_phone_missing" };
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    return { ok: false, skipped: true, reason: "whatsapp_not_configured" };
  }
  try {
    const { sendWhatsAppText, normalizeWaNumber } = await import("@/lib/whatsapp.server");
    const res = await sendWhatsAppText(phone, args.text);
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "whatsapp",
      status: res.ok ? "automatic" : "failed",
      content: args.text,
      recipient: normalizeWaNumber(phone),
      error: res.ok ? null : (res.error ?? `HTTP ${res.status}`),
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error ?? `HTTP ${res.status}` };
  } catch (e: any) {
    await insertDeliveryLog({
      order_id: args.order.id,
      customer_id: args.order.customer_id ?? null,
      channel: "whatsapp",
      status: "failed",
      content: args.text,
      recipient: String(phone),
      error: e?.message ?? String(e),
    });
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function dispatchIptvDeliveryFor(
  orderIdent: string,
  opts?: {
    channels?: IptvDeliveryChannel[];
    force?: boolean;
  },
): Promise<{
  orderId: string;
  channels: Record<
    IptvDeliveryChannel,
    Outcome | { ok: true; skipped: true; reason: "already_sent" }
  >;
  status: "sent" | "failed" | "partial";
}> {
  const order = await loadOrder(orderIdent);
  if (!order) throw new Error(`dispatchIptvDelivery: commande ${orderIdent} introuvable`);
  const meta = (order.metadata ?? {}) as Record<string, any>;
  const delivery = meta.iptv_delivery as IptvDelivery | undefined;
  if (!delivery?.iptv_account_id) {
    throw new Error(`dispatchIptvDelivery: fiche de livraison manquante (commande ${orderIdent})`);
  }

  const sb = await admin();
  // Mark sending
  await sb
    .from("orders")
    .update({
      metadata: { ...meta, iptv_delivery: { ...delivery, delivery_status: "sending" } },
    })
    .eq("id", order.id);

  const customer = await loadCustomer(order.customer_id ?? null);
  const text = buildPlainTextDeliveryMessage(delivery, { orderRef: order.order_ref });
  const requested = opts?.channels ?? (["email", "whatsapp", "telegram"] as IptvDeliveryChannel[]);
  const results: Record<string, any> = {};
  const nextChannelsSent = { ...(delivery.channels_sent ?? {}) };

  for (const ch of requested) {
    if (!opts?.force && nextChannelsSent[ch]?.ok) {
      results[ch] = { ok: true, skipped: true, reason: "already_sent" };
      continue;
    }
    let out: Outcome;
    if (ch === "email") out = await sendEmailChannel({ order, delivery, text });
    else if (ch === "telegram") out = await sendTelegramChannel({ order, customer, text });
    else out = await sendWhatsAppChannel({ order, customer, text });
    results[ch] = out;
    nextChannelsSent[ch] = {
      at: new Date().toISOString(),
      ok: out.ok,
      error: out.error ?? (out.skipped ? (out.reason ?? null) : null),
    };
  }

  const anyOk = Object.values(nextChannelsSent).some((v: any) => v?.ok);
  const allDone = requested.every((c) => nextChannelsSent[c]);
  const lastOkChannel =
    (Object.entries(nextChannelsSent) as [IptvDeliveryChannel, any][])
      .filter(([, v]) => v?.ok)
      .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))[0]?.[0] ?? null;

  const status: "sent" | "failed" | "partial" = anyOk ? (allDone ? "sent" : "partial") : "failed";
  const nextDelivery: IptvDelivery = {
    ...delivery,
    channels_sent: nextChannelsSent,
    delivery_status: anyOk ? "sent" : "failed",
    sent_at: anyOk ? new Date().toISOString() : delivery.sent_at,
    sent_channel: lastOkChannel ?? delivery.sent_channel,
  };
  await sb
    .from("orders")
    .update({
      metadata: { ...meta, iptv_delivery: nextDelivery },
      ...(anyOk ? { status: "completed" } : {}),
    })
    .eq("id", order.id);

  return { orderId: order.id, channels: results as any, status };
}
