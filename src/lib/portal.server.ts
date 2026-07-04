// Portal client (Espace Client) — server-only helpers.
// Cookie-based session, no Supabase Auth user required. Customers identified
// via `customers` table.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

export const PORTAL_COOKIE = "nx_portal_session";
export const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateOtpCode(): string {
  // 6-digit code, zero-padded.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    if (p.slice(0, idx) === name) return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export function buildSessionCookie(token: string, maxAgeSec = Math.floor(SESSION_TTL_MS / 1000)): string {
  const attrs = [
    `${PORTAL_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${maxAgeSec}`,
  ];
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  return `${PORTAL_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export async function findCustomerByIdentifier(identifier: string): Promise<
  | { id: string; email: string; full_name: string | null; phone: string | null; country: string | null }
  | null
> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const sb = supabaseAdmin as any;
  const raw = identifier.trim();
  if (!raw) return null;

  // 1) Direct email match
  if (raw.includes("@")) {
    const { data } = await sb
      .from("customers")
      .select("id, email, full_name, phone, country")
      .ilike("email", raw)
      .maybeSingle();
    if (data?.id) return data;
  }

  // 2) Order reference (NX-XXXX...) → customer
  if (/^NX-/i.test(raw)) {
    const { data: order } = await sb
      .from("orders")
      .select("customer_id, email")
      .eq("order_ref", raw.toUpperCase())
      .maybeSingle();
    if (order) {
      if (order.customer_id) {
        const { data } = await sb
          .from("customers")
          .select("id, email, full_name, phone, country")
          .eq("id", order.customer_id)
          .maybeSingle();
        if (data?.id) return data;
      }
      if (order.email) {
        const { data } = await sb
          .from("customers")
          .select("id, email, full_name, phone, country")
          .ilike("email", order.email)
          .maybeSingle();
        if (data?.id) return data;
      }
    }
  }

  // 3) IPTV username → customer via iptv_accounts
  const { data: acc } = await sb
    .from("iptv_accounts")
    .select("customer_id, order_id")
    .ilike("username", raw)
    .not("customer_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (acc?.customer_id) {
    const { data } = await sb
      .from("customers")
      .select("id, email, full_name, phone, country")
      .eq("id", acc.customer_id)
      .maybeSingle();
    if (data?.id) return data;
  }
  if (acc?.order_id) {
    const { data: order } = await sb
      .from("orders")
      .select("email")
      .eq("id", acc.order_id)
      .maybeSingle();
    if (order?.email) {
      const { data } = await sb
        .from("customers")
        .select("id, email, full_name, phone, country")
        .ilike("email", order.email)
        .maybeSingle();
      if (data?.id) return data;
    }
  }

  return null;
}

export function maskEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [local, domain] = raw.split("@");
  if (!local || !domain) return null;
  const dotIdx = domain.lastIndexOf(".");
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : "";
  const dHead = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain;
  return `${local[0]}***@${dHead[0] ?? ""}***${tld}`;
}

export interface PortalSession {
  customerId: string;
  email: string;
  fullName: string | null;
}

export async function requirePortalSessionFromCookie(cookieHeader: string | null): Promise<PortalSession | null> {
  const raw = readCookie(cookieHeader, PORTAL_COOKIE);
  if (!raw) return null;
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const sb = supabaseAdmin as any;
  const tokenHash = hashToken(raw);
  const { data } = await sb
    .from("client_portal_sessions")
    .select("id, customer_id, email, expires_at, revoked_at, customers ( id, email, full_name )")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  // best-effort last_seen
  await sb.from("client_portal_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  const c = data.customers ?? {};
  return {
    customerId: data.customer_id,
    email: (c.email as string) ?? data.email,
    fullName: (c.full_name as string | null) ?? null,
  };
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  // Store an email delivery row so the operator can see the outgoing OTP
  // in the NCC delivery log, and if Lovable Emails is wired the queue will
  // pick it up. Also send to Telegram admin for visibility.
  const subject = `Nexora IPTV — Code de vérification ${code}`;
  const content = [
    "Bonjour,",
    "",
    `Votre code de vérification pour l'Espace Client Nexora IPTV est :`,
    "",
    `  ${code}`,
    "",
    "Ce code est valable 10 minutes.",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
    "",
    "— L'équipe Nexora IPTV",
  ].join("\n");
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("delivery_logs").insert({
      channel: "email",
      status: "prepared",
      template_id: "portal-otp",
      subject,
      content,
      recipient: email,
    });
  } catch (e) {
    console.error("[portal] otp delivery_logs insert failed", e);
  }
  try {
    const { notifyAdminTelegram } = await import("@/lib/telegram.server");
    await notifyAdminTelegram(`🔐 OTP Espace Client\nDestinataire : ${email}\nCode : ${code}`);
  } catch { /* best effort */ }
  if (process.env.NODE_ENV !== "production") {
    console.info("[portal] OTP for", email, "=", code);
  }
}

export async function sendRenewalConfirmationEmail(input: {
  email: string;
  orderRef: string;
  months: number;
  expiresAt: string | null;
  username: string | null;
  amount: number;
  currency: string;
}): Promise<void> {
  const subject = `Nexora IPTV — Abonnement renouvelé (${input.orderRef})`;
  const content = [
    "Bonjour,",
    "",
    `Votre abonnement Nexora IPTV a bien été renouvelé pour ${input.months} mois.`,
    "",
    input.username ? `Identifiant IPTV : ${input.username}` : "",
    input.expiresAt ? `Nouvelle date d'expiration : ${new Date(input.expiresAt).toLocaleDateString("fr-FR")}` : "",
    `Référence de paiement : ${input.orderRef}`,
    `Montant : ${input.amount} ${input.currency}`,
    "",
    "Vos identifiants restent inchangés — aucune reconfiguration n'est nécessaire.",
    "",
    "— L'équipe Nexora IPTV",
  ].filter(Boolean).join("\n");
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("delivery_logs").insert({
      channel: "email",
      status: "prepared",
      template_id: "portal-renewal",
      subject,
      content,
      recipient: input.email,
    });
  } catch (e) {
    console.error("[portal] renewal delivery_logs insert failed", e);
  }
}