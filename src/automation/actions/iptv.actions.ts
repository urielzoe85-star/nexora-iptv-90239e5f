// Actions IPTV — passent par l'Integration Hub (v1.5).
// Si le connecteur MEGAOTT est prêt (token + provider configurés), les
// actions appellent réellement l'API distante via le hub. Sinon, elles
// restent en mode local (no-op distant) pour ne rien casser.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function megaott() {
  await import("@/integration-hub");
  const { connectorRegistry } = await import("@/integration-hub/core/registry");
  const c = connectorRegistry.get("iptv.megaott") as any;
  return c?.isReady?.() ? c : null;
}

export async function createIptvSubscription(input: {
  customerEmail?: string;
  productId?: string;
  orderId?: string;
  durationMonths?: number;
  username?: string;
  password?: string;
}) {
  const sb = await admin();
  const username = input.username ?? `nx_${Date.now().toString(36)}`;
  const expiresAt = input.durationMonths
    ? new Date(Date.now() + input.durationMonths * 30 * 86_400_000).toISOString()
    : null;

  let remoteMeta: Record<string, unknown> = {};
  const c = await megaott();
  if (c) {
    const r = await c.createUser({ username, password: input.password, packageId: "", expiresAt });
    if (r.ok) {
      remoteMeta = { provider: "megaott", remote_user_id: r.value.providerUserId, m3u_url: r.value.m3uUrl ?? null };
    } else {
      return { simulated: true, reason: `megaott: ${r.error.kind} ${r.error.message}` };
    }
  }

  const { data, error } = await sb.from("iptv_accounts").insert({
    username,
    password: input.password ?? null,
    status: c ? "active" : "available",
    expires_at: expiresAt,
    metadata: { source: "automation", duration_months: input.durationMonths ?? null, ...remoteMeta },
  }).select("id").maybeSingle();
  if (error) {
    return { simulated: true, reason: error.message };
  }
  return { accountId: data?.id ?? null, simulated: !c, remoteUserId: (remoteMeta as any).remote_user_id ?? null };
}

export async function renewIptvSubscription(accountId: string, months = 1) {
  const sb = await admin();
  const next = new Date();
  next.setMonth(next.getMonth() + months);
  const { data: acc } = await sb.from("iptv_accounts").select("metadata").eq("id", accountId).maybeSingle();
  const remoteId = (acc?.metadata as any)?.remote_user_id;
  const c = await megaott();
  if (c && remoteId) {
    const r = await c.extend(remoteId, next.toISOString());
    if (!r.ok) return { simulated: true, reason: `megaott: ${r.error.message}` };
  }
  const { error } = await sb.from("iptv_accounts")
    .update({ expires_at: next.toISOString(), status: "active" })
    .eq("id", accountId);
  if (error) return { simulated: true, reason: error.message };
  return { accountId, expiresAt: next.toISOString(), remote: Boolean(c && remoteId) };
}

export async function setIptvSubscriptionStatus(accountId: string, status: "active" | "suspended" | "expired") {
  const sb = await admin();
  const { data: acc } = await sb.from("iptv_accounts").select("metadata").eq("id", accountId).maybeSingle();
  const remoteId = (acc?.metadata as any)?.remote_user_id;
  const c = await megaott();
  if (c && remoteId) {
    const r = status === "suspended" ? await c.suspendUser(remoteId)
            : status === "active"    ? await c.reactivateUser(remoteId)
            : { ok: true };
    if (!(r as any).ok) return { simulated: true, reason: `megaott: ${(r as any).error?.message}` };
  }
  const { error } = await sb.from("iptv_accounts").update({ status }).eq("id", accountId);
  if (error) return { simulated: true, reason: error.message };
  return { accountId, status, remote: Boolean(c && remoteId) };
}