import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { toE164 } from "@/lib/countries";

// ─── NCC password gate ───────────────────────────────────────────────────
// Vérifie un second mot de passe (env NCC_ACCESS_PASSWORD) pour autoriser
// l'accès au Nexora Control Center depuis le dashboard admin.
export const verifyNccAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ password: z.string().min(1).max(256) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const expected = process.env.NCC_ACCESS_PASSWORD;
    if (!expected) {
      throw new Error("NCC_ACCESS_PASSWORD non configuré côté serveur.");
    }
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const a = createHash("sha256").update(data.password, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) {
      return { ok: false as const };
    }
    const { setNccGateCookie } = await import("@/lib/ncc-gate.server");
    const { expiresAt } = await setNccGateCookie(context.userId);
    return { ok: true as const, expiresAt };
  });

// Vérifie côté serveur si le cookie NCC (2e facteur) est encore valide
// pour l'admin courant. Utilisé par le layout /ncc pour éviter de faire
// confiance à un flag stocké dans le navigateur.
export const getNccUnlockStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { readNccGateCookie, verifyNccToken } = await import("@/lib/ncc-gate.server");
    const token = await readNccGateCookie();
    return { unlocked: verifyNccToken(token, context.userId) };
  });

// Efface le cookie NCC (déverrouillage). Appelé au sign-out ou depuis
// l'écran admin lorsque l'opérateur souhaite verrouiller manuellement.
export const lockNccAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { clearNccGateCookie } = await import("@/lib/ncc-gate.server");
    await clearNccGateCookie();
    return { ok: true as const };
  });

// ─── Bootstrap & identity ────────────────────────────────────────────────

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { exists: (count ?? 0) > 0 };
});

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(8).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists. Sign in instead.");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, email: data.email };
  });

export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { userId: context.userId, isAdmin: Boolean(data) };
  });

// Server-side admin sign-in: validates credentials + admin role before
// returning session tokens. If the account is not an admin, no session is
// ever emitted to the browser — the credential check is performed in an
// ephemeral server-side client and discarded.
export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(1).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const ephemeral = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: signIn, error } = await ephemeral.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !signIn.session || !signIn.user) {
      // Generic message to avoid leaking which factor failed.
      const { recordSecurityEvent } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.admin.signin_failed",
        severity: "warn",
        actor_email: data.email,
        route: "adminSignIn",
        message: "Admin sign-in rejected: invalid credentials",
      });
      throw new Error("Identifiants invalides ou accès refusé.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: signIn.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      // Revoke any refresh token tied to this attempt so the credential check
      // does not leave a usable session anywhere.
      try { await ephemeral.auth.signOut(); } catch { /* noop */ }
      const { recordSecurityEvent } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.admin.signin_not_admin",
        severity: "critical",
        actor_user_id: signIn.user.id,
        actor_email: data.email,
        route: "adminSignIn",
        message: "Valid credentials but user is not admin — session revoked",
      });
      throw new Error("Identifiants invalides ou accès refusé.");
    }
    // Succès : trace info (utile pour corréler avec les webhooks).
    {
      const { recordSecurityEvent } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.admin.signin_success",
        severity: "info",
        actor_user_id: signIn.user.id,
        actor_email: data.email,
        route: "adminSignIn",
        message: "Admin sign-in success",
      });
    }
    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });

// ─── Stats ───────────────────────────────────────────────────────────────

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("status, amount, currency, created_at")
      .gte("created_at", since);
    if (error) throw new Error(error.message);

    const all = orders ?? [];
    const paid = all.filter((o) => o.status === "paid" || o.status === "completed");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = all.filter((o) => new Date(o.created_at) >= today).length;
    const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
    const pending = all.filter((o) => o.status === "pending" || o.status === "processing").length;
    const conv = all.length ? (paid.length / all.length) * 100 : 0;

    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const o of paid) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (k in days) days[k] += Number(o.amount || 0);
    }
    const series = Object.entries(days).map(([date, revenue]) => ({ date, revenue }));

    return {
      ordersTotal: all.length,
      ordersToday: todayCount,
      revenue,
      pending,
      conversion: Math.round(conv * 10) / 10,
      series,
    };
  });

// ─── Orders ──────────────────────────────────────────────────────────────

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("orders")
      .select("id, order_ref, email, full_name, plan_name, amount, currency, method, status, sebpay_reference, metadata, created_at, updated_at, admin_notes")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`order_ref.ilike.%${s}%,email.ilike.%${s}%,full_name.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "processing", "paid", "completed", "failed", "cancelled", "refunded"]).optional(),
      admin_notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { data: row, error } = await (supabaseAdmin as any)
      .from("orders").update(patch).eq("id", data.id)
      .select("id, status, admin_notes").single();
    if (error) throw new Error(error.message);
    return row;
  });

// Confirme manuellement le paiement d'une commande après réception des fonds
// sur le compte Mobile Money de l'admin. Met la commande en "completed",
// prépare le message WhatsApp (lien WhatsApp Web ouvert côté navigateur admin)
// et renvoie aussi les infos pour notifier le client.
export const adminConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("orders")
      .update({ status: "completed" })
      .eq("id", data.id)
      .select("id, order_ref, full_name, email, plan_name, amount, currency, metadata")
      .single();
    if (error) throw new Error(error.message);

    // Construit le lien WhatsApp pré-rempli vers le numéro du client.
    // WhatsApp exige un numéro international SANS "+" ni espaces. Si le
    // numéro local ne contient pas l'indicatif pays, on le préfixe à
    // partir du champ metadata.momo.country (ISO alpha-2).
    const rawPhone: string | undefined = row?.metadata?.momo?.phone;
    const country: string | undefined = row?.metadata?.momo?.country;
    const e164 = rawPhone ? toE164(rawPhone, country) : "";
    const firstName = String(row.full_name ?? "").split(" ")[0] || "client";
    const message =
      `Bonjour ${firstName},\n\n` +
      `Nous confirmons la bonne réception de votre paiement pour l'abonnement ` +
      `« ${row.plan_name} » (réf. ${row.order_ref}).\n\n` +
      `Vos accès Nexora IPTV (M3U, identifiants Xtream Codes) vous seront ` +
      `transmis dans les minutes qui suivent par email et WhatsApp.\n\n` +
      `Merci pour votre confiance.\n— L'équipe Nexora IPTV`;
    const waLink = e164
      ? `https://web.whatsapp.com/send?${new URLSearchParams({
          phone: e164,
          text: message,
          type: "phone_number",
          app_absent: "0",
        }).toString()}`
      : null;

    // Envoi email best-effort. Si l'infrastructure email n'est pas encore
    // configurée (domaine en cours), on renvoie emailSent=false sans casser
    // la confirmation.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const proto = getRequestHeader("x-forwarded-proto") ?? "https";
      const host = getRequestHeader("host");
      if (host) {
        const res = await fetch(`${proto}://${host}/lovable/email/transactional/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
          },
          body: JSON.stringify({
            templateName: "payment-confirmed",
            recipientEmail: row.email,
            idempotencyKey: `payment-confirmed-${row.order_ref}`,
            templateData: {
              firstName,
              orderRef: row.order_ref,
              planName: row.plan_name,
            },
          }),
        });
        emailSent = res.ok;
        if (!res.ok) emailError = `HTTP ${res.status}`;
      } else {
        emailError = "email-infra-not-configured";
      }
    } catch (e: any) {
      emailError = e?.message ?? "send-failed";
    }

    return {
      ok: true,
      orderRef: row.order_ref,
      waLink,
      phone: rawPhone ?? null,
      emailSent,
      emailError,
    };
  });

// ─── Plans ───────────────────────────────────────────────────────────────

const PlanInput = z.object({
  slug: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  price: z.number().nonnegative().max(100000),
  currency: z.string().trim().length(3),
  period_label: z.string().trim().min(1).max(40),
  save_label: z.string().trim().max(40).nullable().optional(),
  popular: z.boolean(),
  active: z.boolean(),
  sort_order: z.number().int(),
});

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("plans").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), data: PlanInput }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    if (data.id) {
      const { error } = await sb.from("plans").update(data.data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await sb.from("plans").insert(data.data).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeletePlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Site settings ───────────────────────────────────────────────────────

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("site_settings").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1).max(64), value: z.any() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("site_settings").upsert({ key: data.key, value: data.value });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Admins ──────────────────────────────────────────────────────────────

export const adminListAdmins = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles").select("user_id, created_at").eq("role", "admin");
    if (error) throw new Error(error.message);
    const out: { user_id: string; email: string | null; created_at: string }[] = [];
    for (const r of roles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      out.push({ user_id: r.user_id, email: u.user?.email ?? null, created_at: r.created_at });
    }
    return out;
  });

export const adminAddAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(8).max(128) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordSecurityEvent } = await import("@/lib/security-events.server");
    const requestId = (context as any).requestId ?? null;

    // Find existing user by email; if none, create one.
    let userId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (cErr || !created.user) throw new Error(cErr?.message ?? "Failed to create user");
      userId = created.user.id;
    }

    const { data: result, error } = await supabaseAdmin.rpc("admin_change_role", {
      _actor_user_id: context.userId,
      _target_user_id: userId,
      _action: "grant_admin",
    });
    if (error) {
      await recordSecurityEvent({
        event_type: "admin.role.grant_failed",
        severity: "warn",
        actor_user_id: context.userId,
        target_user_id: userId,
        request_id: requestId,
        route: "adminAddAdmin",
        message: `Failed to grant admin: ${error.message}`,
        payload: { target_email: data.email },
      });
      throw new Error(error.message);
    }
    const r = (result ?? {}) as { old_role?: string; new_role?: string; admin_count?: number };
    await recordSecurityEvent({
      event_type: "admin.role.granted",
      severity: r.old_role === "admin" ? "info" : "critical",
      actor_user_id: context.userId,
      target_user_id: userId,
      request_id: requestId,
      route: "adminAddAdmin",
      message: `Admin role granted (${r.old_role} → ${r.new_role})`,
      payload: {
        target_email: data.email,
        old_role: r.old_role,
        new_role: r.new_role,
        admin_count: r.admin_count,
      },
    });
    return { ok: true, user_id: userId };
  });

export const adminRemoveAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordSecurityEvent } = await import("@/lib/security-events.server");
    const requestId = (context as any).requestId ?? null;
    const { data: result, error } = await supabaseAdmin.rpc("admin_change_role", {
      _actor_user_id: context.userId,
      _target_user_id: data.user_id,
      _action: "revoke_admin",
    });
    if (error) {
      const isGuard =
        /last active administrator/i.test(error.message) ||
        /cannot revoke your own/i.test(error.message);
      await recordSecurityEvent({
        event_type: isGuard ? "admin.role.revoke_blocked" : "admin.role.revoke_failed",
        severity: "critical",
        actor_user_id: context.userId,
        target_user_id: data.user_id,
        request_id: requestId,
        route: "adminRemoveAdmin",
        message: `Revoke rejected: ${error.message}`,
      });
      throw new Error(error.message);
    }
    const r = (result ?? {}) as { old_role?: string; new_role?: string; admin_count?: number };
    await recordSecurityEvent({
      event_type: "admin.role.revoked",
      severity: "critical",
      actor_user_id: context.userId,
      target_user_id: data.user_id,
      request_id: requestId,
      route: "adminRemoveAdmin",
      message: `Admin role revoked (${r.old_role} → ${r.new_role})`,
      payload: {
        old_role: r.old_role,
        new_role: r.new_role,
        admin_count: r.admin_count,
      },
    });
    return { ok: true };
  });