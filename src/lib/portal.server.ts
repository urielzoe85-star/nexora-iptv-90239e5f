// Portal client (Espace Client) — server-only helpers.
// Cookie-based session, no Supabase Auth user required. Customers identified
// via `customers` table.

import { PORTAL_BASE_URL } from "@/lib/portal-url";

export const PORTAL_COOKIE = "nx_portal_session";
export const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashToken(raw: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateOtpCode(): string {
  // 6-digit code, zero-padded.
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, "0");
}

export function generateSessionToken(): string {
  const value = new Uint8Array(32);
  globalThis.crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// -------- Passwords (scrypt, medium security) --------
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const { randomBytes, scryptSync } = await import("node:crypto");
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (!salt.length || !expected.length) return false;
  const { scryptSync, timingSafeEqual } = await import("node:crypto");
  const derived = scryptSync(password.normalize("NFKC"), salt, expected.length, { N, r, p });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (password.length > 200) return "Mot de passe trop long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

export function generateResetToken(): string {
  return generateSessionToken();
}

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const subject = "Nexora IPTV — Réinitialisation de votre mot de passe";
  const content = [
    "Bonjour,",
    "",
    "Vous avez demandé à réinitialiser le mot de passe de votre Espace Client Nexora IPTV.",
    "",
    "Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :",
    "",
    resetUrl,
    "",
    "Ce lien est valable 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe ne sera pas modifié.",
    "",
    "— L'équipe Nexora IPTV",
  ].join("\n");
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("delivery_logs").insert({
      channel: "email",
      status: "prepared",
      template_id: "portal-password-reset",
      subject,
      content,
      recipient: email,
    });
  } catch (e) {
    console.error("[portal] password reset delivery_logs insert failed", e);
  }
  try {
    const { notifyAdminTelegram } = await import("@/lib/telegram.server");
    await notifyAdminTelegram(`🔑 Reset mot de passe Espace Client\nDestinataire : ${email}\nLien : ${resetUrl}`);
  } catch { /* best effort */ }
  if (process.env.NODE_ENV !== "production") {
    console.info("[portal] password reset for", email, "=>", resetUrl);
  }
}

export function buildPasswordResetUrl(token: string): string {
  return `${PORTAL_BASE_URL}/espace-client/reset-password?token=${encodeURIComponent(token)}`;
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
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
    "SameSite=None",
    "Secure",
    "Partitioned",
    `Max-Age=${maxAgeSec}`,
  ];
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  return `${PORTAL_COOKIE}=; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=0`;
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

export async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

export async function currentSession(): Promise<PortalSession | null> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return requirePortalSessionFromCookie(getRequestHeader("cookie") ?? null);
}

export async function requireSession(): Promise<PortalSession> {
  const session = await currentSession();
  if (!session) throw new Error("Vous devez être connecté à votre Espace Client.");
  return session;
}

export async function openPortalSession(
  sb: any,
  customer: { id: string; email: string },
): Promise<void> {
  const { getRequestHeader, setResponseHeader } = await import("@tanstack/react-start/server");
  const token = generateSessionToken();
  await sb.from("client_portal_sessions").insert({
    token_hash: await hashToken(token),
    customer_id: customer.id,
    email: customer.email.toLowerCase(),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    user_agent: getRequestHeader("user-agent") ?? null,
    ip: getRequestHeader("x-forwarded-for") ?? null,
  });
  setResponseHeader("set-cookie", buildSessionCookie(token));
}

export async function requirePortalSessionFromCookie(cookieHeader: string | null): Promise<PortalSession | null> {
  const raw = readCookie(cookieHeader, PORTAL_COOKIE);
  if (!raw) return null;
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const sb = supabaseAdmin as any;
  const tokenHash = await hashToken(raw);
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