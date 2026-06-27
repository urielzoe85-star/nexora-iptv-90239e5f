// Actions IPTV — passent par les services domain déjà en place (v1.4)
// qui s'appuieront sur l'Integration Hub + MEGAOTT (v1.5) dès que les
// identifiants seront configurés. Tant que le connecteur réel n'est pas
// branché, ces actions retournent un résultat "simulated" et n'altèrent
// pas l'état distant.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function createIptvSubscription(input: {
  customerEmail?: string;
  productId?: string;
  orderId?: string;
  durationMonths?: number;
}) {
  const sb = await admin();
  const { data, error } = await sb.from("iptv_accounts").insert({
    customer_email: input.customerEmail ?? null,
    product_id: input.productId ?? null,
    order_id: input.orderId ?? null,
    status: "pending",
    metadata: { source: "automation", duration_months: input.durationMonths ?? null },
  }).select("id").maybeSingle();
  if (error) {
    return { simulated: true, reason: error.message };
  }
  return { accountId: data?.id ?? null, simulated: false };
}

export async function renewIptvSubscription(accountId: string, months = 1) {
  const sb = await admin();
  const next = new Date();
  next.setMonth(next.getMonth() + months);
  const { error } = await sb.from("iptv_accounts")
    .update({ expires_at: next.toISOString(), status: "active" })
    .eq("id", accountId);
  if (error) return { simulated: true, reason: error.message };
  return { accountId, expiresAt: next.toISOString() };
}

export async function setIptvSubscriptionStatus(accountId: string, status: "active" | "suspended" | "expired") {
  const sb = await admin();
  const { error } = await sb.from("iptv_accounts").update({ status }).eq("id", accountId);
  if (error) return { simulated: true, reason: error.message };
  return { accountId, status };
}