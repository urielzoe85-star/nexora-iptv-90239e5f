// ────────────────────────────────────────────────────────────────────────────
// Builder de la fiche de livraison IPTV — pur, isomorphe.
// Utilisé à la fois par l'attribution auto (workflow payment-confirmed) et
// par l'attribution manuelle (assignIptvAccountToOrder). Garantit que la
// fiche affichée dans le NCC est bit-à-bit identique à celle envoyée au
// client par email / WhatsApp / Telegram.
// ────────────────────────────────────────────────────────────────────────────

// SERVER-ONLY. This module uses `node:crypto` and is blocked from client
// bundles by the `.server.ts` naming convention. All callers must import
// it dynamically from server-side execution contexts (server functions,
// server route handlers, workflow actions).
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildWhatsAppLink } from "./whatsapp-contact";

export type IptvDeliveryChannel = "email" | "whatsapp" | "telegram";

export interface IptvDelivery {
  iptv_account_id: string;
  megaott_subscription_id: string | null;
  username: string;
  password: string | null;
  package: string | null;
  account_type: "trial" | "premium" | null;
  provider: string | null;
  duration_months: number | null;
  expires_at: string | null;
  max_connections: number | null;
  dns_link: string | null;
  dns_link_samsung_lg: string | null;
  portal_link: string | null;
  m3u_url: string | null;
  m3u_with_options_url: string | null;
  enigma_url: string | null;
  playlist_download_url: string | null;
  enigma_download_url: string | null;
  note: string | null;
  delivery_status: "pending" | "ready_to_send" | "sending" | "sent" | "failed";
  channels_sent: Partial<Record<IptvDeliveryChannel, { at: string; ok: boolean; error?: string | null }>>;
  created_at: string;
  sent_at: string | null;
  sent_channel: IptvDeliveryChannel | null;
}

function siteOrigin(): string {
  return (
    process.env.PUBLIC_SITE_URL ||
    "https://nexora-iptv.com"
  ).replace(/\/+$/, "");
}

function extractHostPort(dns: string | null): string | null {
  if (!dns) return null;
  const normalized = /^https?:\/\//i.test(dns) ? dns : `http://${dns}`;
  try {
    const u = new URL(normalized);
    return `${u.protocol}//${u.host}`;
  } catch {
    // dns like "http://host:port" already handled ; fallback: strip trailing path
    return normalized.replace(/\/+$/, "");
  }
}

export function buildM3uUrl(opts: { dns: string | null; username: string | null; password: string | null }): string | null {
  const base = extractHostPort(opts.dns);
  if (!base || !opts.username) return null;
  const u = encodeURIComponent(opts.username);
  const p = encodeURIComponent(opts.password ?? "");
  return `${base}/get.php?username=${u}&password=${p}&type=m3u_plus&output=ts`;
}

export function buildEnigmaUrl(opts: { dns: string | null; username: string | null; password: string | null }): string | null {
  const base = extractHostPort(opts.dns);
  if (!base || !opts.username) return null;
  const u = encodeURIComponent(opts.username);
  const p = encodeURIComponent(opts.password ?? "");
  return `${base}/enigma2.php?username=${u}&password=${p}`;
}

function hmacSecret(): string {
  return (
    process.env.AUTOMATION_CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "nexora-iptv-fallback-secret"
  );
}

export function signPlaylistToken(accountId: string, ttlDays = 90): string {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86_400;
  const payload = `${accountId}.${exp}`;
  const sig = createHmac("sha256", hmacSecret()).update(payload).digest("hex").slice(0, 32);
  // base64url-safe: we keep dots as separators — a.b.c
  return `${accountId}.${exp}.${sig}`;
}

export function verifyPlaylistToken(token: string): { accountId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [accountId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const expected = createHmac("sha256", hmacSecret()).update(`${accountId}.${exp}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { accountId };
}

export function buildPlaylistDownloadUrl(accountId: string, kind: "m3u" | "enigma"): string {
  const t = signPlaylistToken(accountId);
  return `${siteOrigin()}/api/public/iptv/playlist?t=${t}&k=${kind}`;
}

/**
 * Compose la fiche de livraison à partir d'un compte IPTV et d'une commande.
 * Ne fait AUCUN accès réseau/DB — pur : les callers passent les lignes déjà
 * lues. `previous` permet de préserver channels_sent en cas de retry.
 */
export function buildDeliveryFromAccount(input: {
  account: any;
  order?: any;
  providerName?: string | null;
  previous?: Partial<IptvDelivery> | null;
}): IptvDelivery {
  const acc = input.account ?? {};
  const meta = (acc.metadata ?? {}) as Record<string, any>;
  const orderMeta = (input.order?.metadata ?? {}) as Record<string, any>;
  const prev = (input.previous ?? {}) as Partial<IptvDelivery>;

  const dns = acc.dns_link ?? meta.dns_link ?? meta.m3u_url ?? null;
  const dnsSamsung = acc.dns_link_samsung_lg ?? meta.dns_link_samsung_lg ?? null;
  const portal = acc.portal_link ?? meta.portal_link ?? null;
  const m3u = meta.m3u_url ?? buildM3uUrl({ dns, username: acc.username, password: acc.password });
  const m3uPlus = buildM3uUrl({ dns, username: acc.username, password: acc.password });
  const enigma = meta.enigma_url ?? buildEnigmaUrl({ dns, username: acc.username, password: acc.password });

  const durationMonths =
    typeof meta.duration_months === "number" ? meta.duration_months
    : typeof orderMeta.duration_months === "number" ? orderMeta.duration_months
    : null;

  return {
    iptv_account_id: acc.id,
    megaott_subscription_id: acc.megaott_subscription_id ?? meta.remote_user_id ?? null,
    username: acc.username,
    password: acc.password ?? null,
    package: acc.package ?? acc.bouquet ?? meta.package ?? null,
    account_type: (acc.account_type as any) ?? null,
    provider: input.providerName ?? meta.provider ?? null,
    duration_months: durationMonths,
    expires_at: acc.expires_at ?? null,
    max_connections: acc.max_connections ?? null,
    dns_link: dns,
    dns_link_samsung_lg: dnsSamsung,
    portal_link: portal,
    m3u_url: m3u,
    m3u_with_options_url: m3uPlus,
    enigma_url: enigma,
    playlist_download_url: acc.id ? buildPlaylistDownloadUrl(acc.id, "m3u") : null,
    enigma_download_url: acc.id && enigma ? buildPlaylistDownloadUrl(acc.id, "enigma") : null,
    note: acc.notes ?? meta.note ?? null,
    delivery_status: (prev.delivery_status as any) ?? "ready_to_send",
    channels_sent: (prev.channels_sent ?? {}) as IptvDelivery["channels_sent"],
    created_at: prev.created_at ?? new Date().toISOString(),
    sent_at: prev.sent_at ?? null,
    sent_channel: (prev.sent_channel as any) ?? null,
  };
}

export function buildPlainTextDeliveryMessage(d: IptvDelivery, opts?: { orderRef?: string | null }): string {
  const lines = [
    `🎬 Vos accès IPTV — Nexora`,
    opts?.orderRef ? `Commande : ${opts.orderRef}` : "",
    ``,
    `👤 Username : ${d.username}`,
    `🔑 Password : ${d.password ?? "—"}`,
    d.dns_link ? `🔗 DNS : ${d.dns_link}` : "",
    d.dns_link_samsung_lg ? `📺 Samsung/LG : ${d.dns_link_samsung_lg}` : "",
    d.m3u_url ? `📥 M3U : ${d.m3u_url}` : "",
    d.enigma_url ? `📡 Enigma : ${d.enigma_url}` : "",
    d.portal_link ? `🌐 Portail : ${d.portal_link}` : "",
    d.package ? `📦 Package : ${d.package}` : "",
    d.max_connections ? `👥 Connexions max : ${d.max_connections}` : "",
    d.expires_at ? `⏳ Expire le : ${new Date(d.expires_at).toLocaleDateString()}` : "",
    ``,
    opts?.orderRef
      ? `📲 Recevoir aussi sur Telegram : https://t.me/NexoraIPTVBot?start=${opts.orderRef}`
      : "",
    `💬 Nous joindre sur WhatsApp : ${buildWhatsAppLink({ orderRef: opts?.orderRef ?? null })}`,
    `Merci de votre confiance — Nexora IPTV`,
  ];
  return lines.filter(Boolean).join("\n");
}