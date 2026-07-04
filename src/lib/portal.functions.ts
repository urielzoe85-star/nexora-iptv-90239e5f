import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  PORTAL_COOKIE,
  OTP_TTL_MS,
  SESSION_TTL_MS,
  buildSessionCookie,
  clearSessionCookie,
  findCustomerByIdentifier,
  generateOtpCode,
  generateSessionToken,
  hashToken,
  maskEmail,
  readCookie,
  requirePortalSessionFromCookie,
  safeEqualHex,
  sendOtpEmail,
  sendRenewalConfirmationEmail,
  type PortalSession,
} from "@/lib/portal.server";

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

async function currentSession(): Promise<PortalSession | null> {
  const cookie = getRequestHeader("cookie");
  return requirePortalSessionFromCookie(cookie ?? null);
}

async function requireSession(): Promise<PortalSession> {
  const s = await currentSession();
  if (!s) throw new Error("Vous devez être connecté à votre Espace Client.");
  return s;
}

// ---------------------------------------------------------------------------
// Auth : OTP + session
// ---------------------------------------------------------------------------

export const requestPortalOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(3).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const customer = await findCustomerByIdentifier(data.identifier);
    // Réponse volontairement générique — évite d'énumérer les comptes.
    if (!customer) return { ok: true as const, emailMasked: null };

    const sb = await admin();
    // rate-limit : 3 OTPs en 1h par email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("client_portal_otps")
      .select("id", { count: "exact", head: true })
      .ilike("email", customer.email)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 3) {
      return { ok: false as const, reason: "rate_limited" as const };
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const ip = getRequestHeader("x-forwarded-for") ?? null;
    await sb.from("client_portal_otps").insert({
      email: customer.email.toLowerCase(),
      code_hash: hashToken(code),
      expires_at: expiresAt,
      ip,
    });
    await sendOtpEmail(customer.email, code);
    return { ok: true as const, emailMasked: maskEmail(customer.email) };
  });

export const verifyPortalOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        identifier: z.string().trim().min(3).max(120),
        code: z.string().trim().length(6).regex(/^\d{6}$/, "Code invalide"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const customer = await findCustomerByIdentifier(data.identifier);
    if (!customer) throw new Error("Code invalide ou expiré.");

    const sb = await admin();
    const codeHash = hashToken(data.code);
    const { data: otp } = await sb
      .from("client_portal_otps")
      .select("id, code_hash, expires_at, used_at, attempts")
      .ilike("email", customer.email)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!otp) throw new Error("Aucun code en attente. Redemandez-en un.");
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new Error("Ce code a expiré. Redemandez-en un.");
    }
    if ((otp.attempts ?? 0) >= 5) {
      throw new Error("Trop de tentatives. Redemandez un nouveau code.");
    }
    if (!safeEqualHex(otp.code_hash, codeHash)) {
      await sb.from("client_portal_otps").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
      throw new Error("Code incorrect.");
    }
    await sb.from("client_portal_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const ua = getRequestHeader("user-agent") ?? null;
    const ip = getRequestHeader("x-forwarded-for") ?? null;
    await sb.from("client_portal_sessions").insert({
      token_hash: tokenHash,
      customer_id: customer.id,
      email: customer.email.toLowerCase(),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      user_agent: ua,
      ip,
    });
    setResponseHeader("set-cookie", buildSessionCookie(token));
    return { ok: true as const };
  });

export const getPortalMe = createServerFn({ method: "GET" }).handler(async () => {
  const s = await currentSession();
  if (!s) return { authenticated: false as const };
  return { authenticated: true as const, email: s.email, fullName: s.fullName };
});

export const signOutPortal = createServerFn({ method: "POST" }).handler(async () => {
  const cookie = getRequestHeader("cookie");
  const raw = readCookie(cookie ?? null, PORTAL_COOKIE);
  if (raw) {
    const sb = await admin();
    await sb
      .from("client_portal_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(raw));
  }
  setResponseHeader("set-cookie", clearSessionCookie());
  return { ok: true as const };
});

// ---------------------------------------------------------------------------
// Dashboard / data
// ---------------------------------------------------------------------------

export const getPortalDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const sb = await admin();

  const { data: customer } = await sb
    .from("customers")
    .select("id, email, full_name, phone, country")
    .eq("id", s.customerId)
    .maybeSingle();

  const { data: accounts } = await sb
    .from("iptv_accounts")
    .select("id, username, status, expires_at, package, portal_link, dns_link, max_connections, metadata")
    .eq("customer_id", s.customerId)
    .order("expires_at", { ascending: false });

  const { data: orders } = await sb
    .from("orders")
    .select("order_ref, plan_name, amount, currency, method, status, created_at, metadata")
    .eq("customer_id", s.customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  const active = (accounts ?? []).find(
    (a: any) => a.status === "active" || a.status === "delivered" || a.status === "assigned",
  );
  const now = Date.now();
  const daysLeft = active?.expires_at
    ? Math.max(0, Math.round((new Date(active.expires_at).getTime() - now) / 86_400_000))
    : null;

  const { data: announcements } = await sb
    .from("portal_announcements")
    .select("id, title, body, severity, published_at")
    .eq("active", true)
    .order("published_at", { ascending: false })
    .limit(5);

  return {
    customer,
    activeSubscription: active
      ? {
          id: active.id,
          username: active.username,
          status: active.status,
          expiresAt: active.expires_at,
          daysLeft,
          package: active.package,
          portalLink: active.portal_link,
          dnsLink: active.dns_link,
          maxConnections: active.max_connections,
        }
      : null,
    subscriptions: (accounts ?? []).map((a: any) => ({
      id: a.id,
      username: a.username,
      status: a.status,
      expiresAt: a.expires_at,
      package: a.package,
    })),
    orders: orders ?? [],
    announcements: announcements ?? [],
  };
});

export const getPortalOrders = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const sb = await admin();
  const { data } = await sb
    .from("orders")
    .select("order_ref, plan_name, amount, currency, method, status, sebpay_reference, created_at, updated_at, metadata")
    .eq("customer_id", s.customerId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

// ---------------------------------------------------------------------------
// Renewal
// ---------------------------------------------------------------------------

export const listRenewalPlans = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb
    .from("renewal_plans")
    .select("id, duration_months, name, price, currency, description, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((p: any) => ({
    id: p.id as string,
    durationMonths: p.duration_months as number,
    name: p.name as string,
    price: Number(p.price),
    currency: p.currency as string,
    description: p.description ?? null,
  }));
});

export const listPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { PAYMENT_PROVIDER_LIST } = await import("@/domain/providers/payments");
  return PAYMENT_PROVIDER_LIST.filter((p) => p.enabled).map((p) => ({
    id: p.id,
    label: p.label,
  }));
});

export const createRenewalOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        planId: z.string().uuid(),
        accountId: z.string().uuid(),
        method: z.enum(["sebpay", "binance_pay_manual"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    const sb = await admin();

    // Vérifier que l'account appartient bien au client
    const { data: acc } = await sb
      .from("iptv_accounts")
      .select("id, username, package")
      .eq("id", data.accountId)
      .eq("customer_id", s.customerId)
      .maybeSingle();
    if (!acc?.id) throw new Error("Compte IPTV introuvable.");

    const { data: plan } = await sb
      .from("renewal_plans")
      .select("id, duration_months, name, price, currency")
      .eq("id", data.planId)
      .eq("active", true)
      .maybeSingle();
    if (!plan?.id) throw new Error("Offre de renouvellement indisponible.");

    // Générer l'ordre
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let ref = "NX-";
    for (let i = 0; i < 10; i++) ref += chars[Math.floor(Math.random() * chars.length)];

    const metadata = {
      kind: "renewal",
      renewal_account_id: acc.id,
      renewal_username: acc.username,
      duration_months: plan.duration_months,
      via: "portal",
    };

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        order_ref: ref,
        email: s.email,
        full_name: s.fullName,
        customer_id: s.customerId,
        plan_id: plan.id,
        plan_name: `Renouvellement ${plan.name}`,
        amount: Number(plan.price),
        currency: plan.currency,
        method: data.method,
        status: "pending",
        metadata,
      })
      .select("order_ref, amount, currency")
      .single();
    if (error) throw new Error(error.message);

    return {
      orderRef: order.order_ref,
      amount: order.amount,
      currency: order.currency,
      method: data.method,
    };
  });

// ---------------------------------------------------------------------------
// Profile & support
// ---------------------------------------------------------------------------

export const updatePortalProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        phone: z.string().trim().max(30).optional().or(z.literal("")),
        country: z.string().trim().max(2).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    const sb = await admin();
    const patch: Record<string, any> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.country !== undefined) patch.country = data.country || null;
    const { error } = await sb.from("customers").update(patch).eq("id", s.customerId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createPortalSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        subject: z.string().trim().min(3).max(200),
        message: z.string().trim().min(5).max(4000),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    const sb = await admin();
    const { data: ticket, error } = await sb
      .from("support_tickets")
      .insert({
        customer_id: s.customerId,
        email: s.email,
        subject: data.subject,
        status: "open",
        priority: data.priority,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("support_messages").insert({
      ticket_id: ticket.id,
      author_type: "customer",
      body: data.message,
    });
    return { ok: true as const, ticketId: ticket.id };
  });

export const listPortalTickets = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const sb = await admin();
  const { data } = await sb
    .from("support_tickets")
    .select("id, subject, status, priority, created_at, updated_at")
    .eq("customer_id", s.customerId)
    .order("updated_at", { ascending: false });
  return data ?? [];
});

export const getPortalAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb
    .from("portal_announcements")
    .select("id, title, body, severity, published_at")
    .eq("active", true)
    .order("published_at", { ascending: false });
  return data ?? [];
});