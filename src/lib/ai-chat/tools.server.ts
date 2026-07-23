// AI SDK tools for Nexora AI Chat. Server-only.
// Read-only DB tools + one universal "create_action_request" tool that
// stages a change for admin approval instead of executing it directly.
import { tool } from "ai";
import { z } from "zod";

export interface ToolContext {
  scope: "client" | "ncc";
  threadId: string | null;
  actor: {
    userId: string | null;
    email: string | null;
    label: string | null;
  };
}

function makeCreateActionRequest(ctx: ToolContext) {
  return tool({
    description:
      "Enregistre une demande d'action pour validation manuelle par un administrateur Nexora. " +
      "À utiliser pour TOUTE opération modificatrice (activer/prolonger un abonnement, envoyer un message, créer une ligne IPTV, rembourser, publier, etc.). " +
      "N'exécute rien immédiatement — l'admin approuve ou rejette dans /ncc/ai/approvals.",
    inputSchema: z.object({
      tool: z.string().describe("Identifiant technique de l'action, ex: 'send_customer_message', 'extend_iptv_subscription', 'refund_order'."),
      summary: z.string().describe("Résumé humain (1–2 phrases) de ce que l'admin doit approuver."),
      args: z.record(z.string(), z.unknown()).default({}).describe("Paramètres structurés de l'action."),
    }),
    execute: async ({ tool: toolName, summary, args }) => {
      const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
      const { data, error } = await (supabaseAdmin as any)
        .from("ai_action_requests")
        .insert({
          thread_id: ctx.threadId,
          scope: ctx.scope,
          requested_by_user_id: ctx.actor.userId,
          requested_by_email: ctx.actor.email,
          requested_by_label: ctx.actor.label,
          tool: toolName,
          args,
          summary,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      try {
        const { notifyAdminTelegram } = await import("@/lib/telegram.server");
        await notifyAdminTelegram(
          `🤖 <b>Nouvelle demande IA</b>\nScope: ${ctx.scope}\nOutil: <code>${toolName}</code>\n${summary}\n\n→ /ncc/ai/approvals`,
        );
      } catch {
        /* best-effort */
      }
      return { ok: true, requestId: data?.id, status: "pending", message: "Demande transmise à un administrateur." };
    },
  });
}

function readOnlyTools() {
  return {
    search_plans: tool({
      description: "Liste les offres/plans Nexora publiées (nom, prix, devise, durée).",
      inputSchema: z.object({
        query: z.string().optional().describe("Filtre optionnel sur le nom."),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ query, limit }) => {
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        let q = (supabaseAdmin as any).from("plans").select("id,name,price,currency,duration_days,is_active").eq("is_active", true).limit(limit);
        if (query) q = q.ilike("name", `%${query}%`);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, plans: data ?? [] };
      },
    }),
    site_links: tool({
      description: "Renvoie les liens utiles du site public Nexora IPTV pour orienter un visiteur.",
      inputSchema: z.object({}),
      execute: async () => ({
        ok: true,
        links: {
          pricing: "https://nexora-iptv.com/pricing",
          products: "https://nexora-iptv.com/produits",
          reseller: "https://nexora-iptv.com/reseller",
          downloads: "https://nexora-iptv.com/downloads",
          blog: "https://nexora-iptv.com/blog",
          portal: "https://account.nexora-iptv.com",
          whatsapp: "https://wa.me/237698608808",
        },
      }),
    }),
  };
}

function nccReadTools() {
  return {
    stats_overview: tool({
      description: "Vue d'ensemble business: nombre de commandes payées, en attente, chiffre d'affaires (30 derniers jours).",
      inputSchema: z.object({ days: z.number().int().min(1).max(365).default(30) }),
      execute: async ({ days }) => {
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const { data: orders, error } = await (supabaseAdmin as any)
          .from("orders")
          .select("status, total_amount, currency, created_at")
          .gte("created_at", since);
        if (error) return { ok: false, error: error.message };
        const total = (orders ?? []).length;
        const paid = (orders ?? []).filter((o: any) => o.status === "paid").length;
        const pending = (orders ?? []).filter((o: any) => o.status === "pending").length;
        const revenue = (orders ?? [])
          .filter((o: any) => o.status === "paid")
          .reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);
        return { ok: true, windowDays: days, total, paid, pending, revenue };
      },
    }),
    find_customer: tool({
      description: "Recherche un client par email, téléphone, nom ou id (top 5).",
      inputSchema: z.object({ query: z.string().min(2) }),
      execute: async ({ query }) => {
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        const like = `%${query}%`;
        const { data, error } = await (supabaseAdmin as any)
          .from("customers")
          .select("id,email,phone,full_name,country,created_at")
          .or(`email.ilike.${like},phone.ilike.${like},full_name.ilike.${like}`)
          .limit(5);
        if (error) return { ok: false, error: error.message };
        return { ok: true, customers: data ?? [] };
      },
    }),
    recent_orders: tool({
      description: "Liste les commandes récentes (option: filtrer par statut ou email client).",
      inputSchema: z.object({
        status: z.string().optional(),
        email: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      execute: async ({ status, email, limit }) => {
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        let q = (supabaseAdmin as any).from("orders")
          .select("id,order_code,status,total_amount,currency,customer_email,created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (status) q = q.eq("status", status);
        if (email) q = q.eq("customer_email", email);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, orders: data ?? [] };
      },
    }),
    iptv_account_lookup: tool({
      description: "Recherche un compte IPTV par identifiant client ou email.",
      inputSchema: z.object({ query: z.string().min(2) }),
      execute: async ({ query }) => {
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        const like = `%${query}%`;
        const { data, error } = await (supabaseAdmin as any)
          .from("iptv_accounts")
          .select("id,customer_email,customer_name,username,status,expires_at,provider,plan_name")
          .or(`customer_email.ilike.${like},customer_name.ilike.${like},username.ilike.${like}`)
          .limit(5);
        if (error) return { ok: false, error: error.message };
        return { ok: true, accounts: data ?? [] };
      },
    }),
  };
}

export function buildClientTools(ctx: ToolContext) {
  return {
    ...readOnlyTools(),
    create_action_request: makeCreateActionRequest(ctx),
    request_human_handoff: tool({
      description:
        "Marque la conversation visiteur comme nécessitant un agent humain Nexora. " +
        "À utiliser dès que l'utilisateur demande explicitement « parler à un humain / un conseiller / un agent » " +
        "ou face à un problème sensible (paiement bloqué, remboursement, litige). " +
        "Ne renvoie l'utilisateur vers aucun autre canal : le conseiller répondra directement dans cette fenêtre.",
      inputSchema: z.object({
        reason: z.string().describe("Raison courte (1 phrase) — ce que veut l'utilisateur."),
        contact_hint: z.string().optional().describe("Nom, email ou téléphone si l'utilisateur les a donnés."),
      }),
      execute: async ({ reason, contact_hint }) => {
        if (!ctx.threadId) return { ok: false, error: "no_thread" };
        const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
        await (supabaseAdmin as any).from("ai_chat_threads")
          .update({
            handoff_status: "requested",
            handoff_requested_at: new Date().toISOString(),
            visitor_meta: (supabaseAdmin as any).rpc ? undefined : undefined,
          })
          .eq("id", ctx.threadId);
        try {
          const { notifyAdminTelegram } = await import("@/lib/telegram.server");
          const url = `https://account.nexora-iptv.com/ncc/ai/inbox/${ctx.threadId}`;
          await notifyAdminTelegram(
            `🆘 <b>Un visiteur demande un humain</b>\n${reason}\n${contact_hint ? "Contact: " + contact_hint + "\n" : ""}→ ${url}`,
          );
        } catch { /* best-effort */ }
        return {
          ok: true,
          message:
            "Un conseiller Nexora rejoint la conversation. Reste sur cette page — sa réponse apparaîtra ici même dans quelques instants.",
        };
      },
    }),
  };
}

export function buildNccTools(ctx: ToolContext) {
  return {
    ...readOnlyTools(),
    ...nccReadTools(),
    create_action_request: makeCreateActionRequest(ctx),
  };
}