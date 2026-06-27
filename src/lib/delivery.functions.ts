// Server functions pour la livraison des abonnements (WhatsApp / Telegram / Email).
// Semi-auto aujourd'hui : la couche UI ouvre le canal natif puis appelle
// logDelivery() pour tracer l'action. Les mêmes endpoints serviront demain
// à l'envoi automatique (WhatsApp Business / Bot Telegram / SMTP).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ok, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Forbidden");
  return supabaseAdmin as any;
}

const ChannelEnum = z.enum(["whatsapp", "telegram", "email"]);
const StatusEnum = z.enum(["prepared", "copied", "sent", "automatic", "failed"]);

export const logDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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