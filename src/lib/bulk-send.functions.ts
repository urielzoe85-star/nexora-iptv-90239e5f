// ────────────────────────────────────────────────────────────────────────────
// Envoi en masse (bulk) — messages pré-rédigés sur WhatsApp / Telegram / Email
// pour 3 scénarios : livraison, rappel de renouvellement, relance paiement.
// Chaque canal réutilise la même infra que les envois unitaires (delivery_logs,
// suppressed_emails, queue email, WhatsApp Cloud, Telegram gateway).
// ────────────────────────────────────────────────────────────────────────────
import { createServerFn } from "@tanstack/react-start";
import { requireNccUnlock } from "@/lib/require-ncc-unlock";
import { z } from "zod";
import {
  buildDeliveryContext, renderTemplate, type DeliveryChannel,
} from "@/domain/delivery/message-engine";
import { BULK_TEMPLATES, getBulkTemplate, type BulkScenario } from "@/domain/delivery/builtin-templates";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

const ScenarioEnum = z.enum(["delivery", "renewal", "payment_reminder", "marketing", "custom"]);
const ChannelEnum = z.enum(["whatsapp", "telegram", "email"]);

// ────────────────────────────────────────────────────────────────────────────
// LIST TARGETS — construit la liste des destinataires candidats.
// ────────────────────────────────────────────────────────────────────────────
export const listBulkTargets = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      scenario: ScenarioEnum,
      days: z.number().int().min(1).max(90).default(30),
      limit: z.number().int().min(1).max(500).default(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await admin(context.userId);

    if (data.scenario === "renewal") {
      // Comptes IPTV expirant dans les prochains N jours (non expirés).
      const now = new Date();
      const nowISO = now.toISOString();
      const maxISO = new Date(now.getTime() + data.days * 86_400_000).toISOString();
      const { data: rows, error } = await sb
        .from("iptv_accounts")
        .select("id, username, expires_at, customer_id, package, customers(email, full_name, phone, metadata)")
        .not("customer_id", "is", null)
        .gte("expires_at", nowISO)
        .lte("expires_at", maxISO)
        .order("expires_at", { ascending: true })
        .limit(data.limit);
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r: any) => {
        const daysLeft = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86_400_000);
        return {
          id: r.id,
          kind: "iptv_account" as const,
          label: r.username,
          expires_at: r.expires_at,
          days_left: daysLeft,
          customer_id: r.customer_id,
          email: r.customers?.email ?? null,
          full_name: r.customers?.full_name ?? null,
          phone: r.customers?.phone ?? null,
          telegram_chat_id: r.customers?.metadata?.telegram_chat_id ?? null,
          package: r.package ?? null,
        };
      });
    }

    // delivery / payment_reminder / marketing / custom → basés sur les commandes
    let statusIn: string[];
    if (data.scenario === "payment_reminder") statusIn = ["pending", "processing"];
    else if (data.scenario === "marketing" || data.scenario === "custom") statusIn = ["completed", "paid", "active"];
    else statusIn = ["completed", "paid"]; // livraison : rappel des accès aux clients payés
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows, error } = await sb
      .from("orders")
      .select("id, order_ref, email, full_name, phone, plan_name, amount, currency, status, metadata, created_at, customer_id, customers(email, full_name, phone, metadata)")
      .in("status", statusIn)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      kind: "order" as const,
      label: r.order_ref,
      created_at: r.created_at,
      status: r.status,
      customer_id: r.customer_id,
      email: r.customers?.email ?? r.email ?? null,
      full_name: r.customers?.full_name ?? r.full_name ?? null,
      phone: r.customers?.phone ?? r.phone ?? r.metadata?.momo?.phone ?? null,
      telegram_chat_id: r.customers?.metadata?.telegram_chat_id ?? null,
      plan_name: r.plan_name ?? null,
      amount: r.amount ?? null,
      currency: r.currency ?? null,
      order_ref: r.order_ref,
      metadata: r.metadata ?? null,
    }));
  });

// ────────────────────────────────────────────────────────────────────────────
// Helpers d'envoi bas-niveau — imitent delivery.functions.ts sans repasser
// par la RPC (batch => un seul appel serveur, throttle interne).
// ────────────────────────────────────────────────────────────────────────────
async function sendWhatsApp(text: string, phone: string) {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    return { ok: false, error: "whatsapp_not_configured" };
  }
  const { sendWhatsAppText, normalizeWaNumber } = await import("@/lib/whatsapp.server");
  const res = await sendWhatsAppText(phone, text);
  return { ok: res.ok, error: res.ok ? null : (res.error ?? `HTTP ${res.status}`), recipient: normalizeWaNumber(phone) };
}

async function sendTelegram(text: string, chatId: string | number) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "telegram_not_configured" };
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const body = await res.json().catch(() => ({}));
  const ok = res.ok && body?.ok !== false;
  return { ok, error: ok ? null : (body?.description ?? `HTTP ${res.status}`), recipient: String(chatId) };
}

async function sendEmail(sb: any, args: { subject: string; body: string; recipient: string; label: string; orderId?: string }) {
  const { data: suppressed } = await sb
    .from("suppressed_emails").select("id").eq("email", args.recipient.toLowerCase()).maybeSingle();
  if (suppressed) return { ok: false, error: "suppressed" };
  const messageId = crypto.randomUUID();
  const html = `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.5;color:#0f172a;padding:16px">${args.body.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string))}</pre>`;
  await sb.from("email_send_log").insert({
    message_id: messageId, template_name: args.label,
    recipient_email: args.recipient, status: "pending",
  });
  const { getOrCreateUnsubscribeToken } = await import("@/lib/email-unsubscribe.server");
  let unsubscribeToken: string;
  try { unsubscribeToken = await getOrCreateUnsubscribeToken(args.recipient); }
  catch (e: any) { return { ok: false, error: `unsubscribe_token: ${e?.message ?? e}` }; }
  const { error } = await sb.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: args.recipient,
      from: `Nexora IPTV <noreply@notify.nexora-iptv.com>`,
      sender_domain: "notify.nexora-iptv.com",
      subject: args.subject,
      html, text: args.body,
      purpose: "transactional",
      label: args.label,
      idempotency_key: `bulk-${args.label}-${args.orderId ?? args.recipient}-${Date.now()}`,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) return { ok: false, error: error.message };
  try { await sb.rpc("email_queue_dispatch"); } catch { /* best effort */ }
  return { ok: true, error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// BULK SEND — la vraie fonction : rend le template pour chaque cible et envoie
// sur les canaux choisis. Throttle 200ms entre chaque cible pour ménager Meta.
// ────────────────────────────────────────────────────────────────────────────
const TargetSchema = z.object({
  kind: z.enum(["order", "iptv_account", "manual"]),
  id: z.string(),
  label: z.string().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  telegram_chat_id: z.union([z.string(), z.number()]).nullable().optional(),
  order_ref: z.string().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().nullable().optional(),
  package: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  metadata: z.any().optional(),
});

export const bulkSendMessages = createServerFn({ method: "POST" })
  .middleware([requireNccUnlock])
  .inputValidator((d: unknown) =>
    z.object({
      template_id: z.string().min(1).max(80),
      channels: z.array(ChannelEnum).min(1),
      targets: z.array(TargetSchema).min(1).max(500),
      scenario: ScenarioEnum,
      custom_subject: z.string().trim().max(200).optional(),
      custom_body: z.string().trim().min(10).max(4000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let tpl: { id: string; name: string; body: string; subject?: string };
    if (data.template_id === "custom") {
      if (!data.custom_body) throw new Error("Message personnalisé vide.");
      tpl = {
        id: "custom",
        name: "Message personnalisé",
        body: data.custom_body,
        subject: data.custom_subject || "Message NEXORA",
      };
    } else {
      const found = getBulkTemplate(data.template_id);
      if (!found) throw new Error(`Template inconnu : ${data.template_id}`);
      tpl = found;
    }
    const sb = await admin(context.userId);

    let sent = 0, failed = 0, skipped = 0;
    const details: Array<{ target: string; channel: DeliveryChannel; ok: boolean; reason?: string | null }> = [];

    for (const t of data.targets) {
      // Reconstitue un contexte de rendu à partir des données de la cible.
      const order = {
        order_ref: t.order_ref ?? "",
        plan_name: t.plan_name ?? t.package ?? "Abonnement IPTV",
        email: t.email ?? "",
        full_name: t.full_name ?? "",
        phone: t.phone ?? "",
        amount: t.amount ?? "",
        currency: t.currency ?? "XAF",
        metadata: t.metadata ?? {},
      };
      const delivery = t.kind === "iptv_account"
        ? { username: t.label ?? "", package: t.package ?? "", expires_at: t.expires_at ?? null }
        : {};
      const ctx = buildDeliveryContext({
        order,
        customer: { email: t.email, full_name: t.full_name, phone: t.phone },
        delivery,
      });
      const text = renderTemplate(tpl.body, ctx);
      const subject = renderTemplate(tpl.subject ?? tpl.name, ctx);

      for (const ch of data.channels) {
        const orderId = t.kind === "order" ? t.id : null;
        let out: { ok: boolean; error?: string | null; recipient?: string };
        if (ch === "whatsapp") {
          if (!t.phone) { skipped++; details.push({ target: t.label ?? t.id, channel: ch, ok: false, reason: "phone_missing" }); continue; }
          out = await sendWhatsApp(text, t.phone);
        } else if (ch === "telegram") {
          if (!t.telegram_chat_id) { skipped++; details.push({ target: t.label ?? t.id, channel: ch, ok: false, reason: "telegram_chat_id_missing" }); continue; }
          out = await sendTelegram(text, t.telegram_chat_id);
        } else {
          if (!t.email) { skipped++; details.push({ target: t.label ?? t.id, channel: ch, ok: false, reason: "email_missing" }); continue; }
          out = await sendEmail(sb, { subject, body: text, recipient: t.email, label: `bulk-${data.scenario}`, orderId: orderId ?? undefined });
          (out as any).recipient = t.email;
        }

        if (out.ok) sent++; else failed++;
        details.push({ target: t.label ?? t.id, channel: ch, ok: out.ok, reason: out.error ?? null });

        // Trace dans delivery_logs (uniquement si on a un order_id, sinon on garde l'événement en mémoire).
        if (orderId) {
          try {
            await sb.from("delivery_logs").insert({
              order_id: orderId,
              customer_id: t.customer_id ?? null,
              channel: ch,
              status: out.ok ? "automatic" : "failed",
              template_id: tpl.id,
              subject: ch === "email" ? subject : null,
              content: text,
              recipient: (out as any).recipient ?? t.phone ?? t.email ?? null,
              admin_id: context.userId,
              error: out.error ?? null,
            });
          } catch { /* trace non bloquante */ }
        }
      }

      // Throttle léger — Meta accepte plusieurs req/s mais on reste prudent.
      await new Promise((r) => setTimeout(r, 200));
    }

    return { sent, failed, skipped, total: data.targets.length, details };
  });

// ────────────────────────────────────────────────────────────────────────────
// LIST TEMPLATES — pour peupler le sélecteur côté client.
// ────────────────────────────────────────────────────────────────────────────
export const listBulkTemplates = createServerFn({ method: "GET" })
  .middleware([requireNccUnlock])
  .handler(async () => {
    return BULK_TEMPLATES.map((t) => ({
      id: t.id, name: t.name, subject: t.subject ?? "", body: t.body,
      scenario: (t as any).scenario as BulkScenario, language: t.language,
    }));
  });