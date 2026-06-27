// Moteur de génération de message — pur, isomorphe, réutilisable.
// La couche d'envoi (manuel aujourd'hui, API demain) consomme ce moteur ;
// seule la méthode d'expédition changera dans la version automatisée.

export type DeliveryChannel = "whatsapp" | "telegram" | "email";

export interface DeliveryContext {
  client_name: string;
  product_name: string;
  username: string;
  password: string;
  package: string;
  dns: string;
  dns_samsung_lg: string;
  portal_link: string;
  expiration_date: string;
  max_connections: string;
  order_ref: string;
  email: string;
  phone: string;
}

export interface DeliveryTemplate {
  id: string;
  name: string;
  channel: DeliveryChannel | "any";
  language: "fr" | "en";
  subject?: string;
  body: string;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return "—"; }
};

export function buildDeliveryContext(input: {
  order: any;
  customer: { email?: string | null; full_name?: string | null; phone?: string | null } | null;
  delivery: any | null;
}): DeliveryContext {
  const d = input.delivery ?? {};
  const o = input.order ?? {};
  const c = input.customer ?? {};
  return {
    client_name: (c.full_name || o.full_name || (c.email ?? o.email ?? "").split("@")[0] || "Client").toString(),
    product_name: (o.plan_name ?? d.package ?? "Abonnement IPTV").toString(),
    username: (d.username ?? "—").toString(),
    password: (d.password ?? "—").toString(),
    package: (d.package ?? o.plan_name ?? "—").toString(),
    dns: (d.dns_link ?? "—").toString(),
    dns_samsung_lg: (d.dns_link_samsung_lg ?? d.dns_link ?? "—").toString(),
    portal_link: (d.portal_link ?? "—").toString(),
    expiration_date: fmtDate(d.expires_at),
    max_connections: (d.max_connections ?? "—").toString(),
    order_ref: (o.order_ref ?? "").toString(),
    email: (c.email ?? o.email ?? "").toString(),
    phone: (c.phone ?? "").toString(),
  };
}

export function renderTemplate(tpl: string, ctx: DeliveryContext): string {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const v = (ctx as any)[key];
    return v === undefined || v === null || v === "" ? "—" : String(v);
  });
}

export function buildAccessSnippet(ctx: DeliveryContext): string {
  return [
    `Username : ${ctx.username}`,
    `Password : ${ctx.password}`,
    `DNS : ${ctx.dns}`,
    `Expiration : ${ctx.expiration_date}`,
  ].join("\n");
}

// Normalisation E.164 sans le '+' pour wa.me
export function normalizePhoneForWa(phone: string): string {
  return (phone || "").replace(/[^\d]/g, "");
}

export const TEMPLATE_VARIABLES = [
  "client_name", "product_name", "username", "password",
  "package", "dns", "dns_samsung_lg", "portal_link",
  "expiration_date", "max_connections", "order_ref", "email", "phone",
] as const;