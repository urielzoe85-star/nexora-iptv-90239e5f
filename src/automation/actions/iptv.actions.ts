// Actions IPTV — passent par l'Integration Hub (v1.5).
// Si le connecteur MEGAOTT est prêt (token + provider configurés), les
// actions appellent réellement l'API distante via le hub. Sinon, elles
// restent en mode local (no-op distant) pour ne rien casser.

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

async function megaott() {
  await import("@/integration-hub");
  const { connectorRegistry } = await import("@/integration-hub/core/registry");
  const c = connectorRegistry.get("iptv.megaott") as any;
  if (!c?.isReady?.()) return null;
  // Extra async gate: the connector's isReady() only checks the secret,
  // but the workflow must be considered "in simulated mode" whenever no
  // MEGAOTT provider row is active. This lets E2E and CI runs disable
  // the real upstream deterministically by flipping every megaott provider
  // row to `status = 'inactive'` — no code path calls the real API in
  // that state and the workflow falls back to the local stub branch.
  try {
    const sb = await admin();
    const { data } = await sb
      .from("iptv_providers")
      .select("id")
      .or("metadata->>kind.eq.megaott,name.ilike.%megaott%")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    return data?.id ? c : null;
  } catch {
    return null;
  }
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

  // Resolve the parent order first so every provisioning path can attach the
  // account to the command and the public tracking page can see the delivery.
  let orderRow: { id: string; customer_id: string | null; email?: string | null; metadata?: any } | null = null;
  if (input.orderId) {
    const { data } = await sb
      .from("orders")
      .select("id, customer_id, email, metadata")
      .eq("order_ref", input.orderId)
      .maybeSingle();
    orderRow = (data as any) ?? null;
  }

  // Idempotency at the action level: if an account was already provisioned
  // for this order, return it instead of creating a duplicate. The queue's
  // idempotency_key normally prevents this, but a manual replay of a failed
  // run (after the row was created) could still re-enter here.
  if (input.orderId) {
    const { data: existing } = await sb
      .from("iptv_accounts")
      .select("id, username, password, order_id, customer_id, metadata")
      .eq("metadata->>order_ref", input.orderId)
      .maybeSingle();
    let row = existing as any;
    if (!row?.id && orderRow?.id) {
      const { data: byOrder } = await sb
        .from("iptv_accounts")
        .select("id, username, password, order_id, customer_id, metadata")
        .eq("order_id", orderRow.id)
        .maybeSingle();
      row = byOrder as any;
    }
    if (row?.id) {
      return {
        accountId: row.id,
        username: row.username,
        password: row.password ?? null,
        simulated: false,
        remoteUserId: (row.metadata as any)?.remote_user_id ?? null,
        orderId: row.order_id ?? orderRow?.id ?? null,
        customerId: row.customer_id ?? orderRow?.customer_id ?? null,
        deduplicated: true,
      };
    }
  }

  const username = input.username ?? `nx_${Date.now().toString(36)}`;
  const password = input.password ?? `pw_${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = input.durationMonths
    ? new Date(Date.now() + input.durationMonths * 30 * 86_400_000).toISOString()
    : null;

  async function assignLocalAvailableAccount(reason: string) {
    const { data: candidates, error } = await sb
      .from("iptv_accounts")
      .select("*")
      .eq("status", "available")
      .is("order_id", null)
      .limit(50);
    if (error) throw new Error(`iptv_accounts local pool lookup failed: ${error.message}`);
    const now = Date.now();
    const pool = ((candidates ?? []) as any[]).sort((a, b) => {
      const ax = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
      const bx = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return bx - ax;
    });
    const picked = pool.find((a) => !a.expires_at || new Date(a.expires_at).getTime() > now) ?? pool[0];
    if (!picked?.id) return null;

    const meta = (picked.metadata ?? {}) as Record<string, unknown>;
    const nextExpiresAt = picked.expires_at ?? expiresAt;
    const { data: assigned, error: upErr } = await sb
      .from("iptv_accounts")
      .update({
        status: "active",
        order_id: orderRow?.id ?? null,
        customer_id: orderRow?.customer_id ?? null,
        expires_at: nextExpiresAt,
        metadata: {
          ...meta,
          source: meta.source ?? "local_pool",
          assignment_source: reason,
          assigned_at: new Date().toISOString(),
          duration_months: input.durationMonths ?? null,
          order_ref: input.orderId ?? null,
          customer_email: input.customerEmail ?? orderRow?.email ?? null,
        },
      })
      .eq("id", picked.id)
      .eq("status", "available")
      .select("*")
      .maybeSingle();
    if (upErr) throw new Error(`iptv_accounts local pool assign failed: ${upErr.message}`);
    if (!assigned?.id) return null;
    return {
      accountId: assigned.id,
      username: assigned.username,
      password: assigned.password ?? null,
      simulated: false,
      localPool: true,
      fallbackReason: reason,
      orderId: orderRow?.id ?? null,
      customerId: orderRow?.customer_id ?? null,
      m3uUrl: (assigned.metadata as any)?.m3u_url ?? null,
      remoteUserId: (assigned.metadata as any)?.remote_user_id ?? null,
    };
  }

  // Prefer the imported local inventory: those are real credentials already
  // present in the platform, and they keep deliveries working when MEGAOTT's
  // create endpoint is unavailable or misconfigured.
  const localFirst = await assignLocalAvailableAccount("local_pool_first");
  if (localFirst) return localFirst;

  let remoteMeta: Record<string, unknown> = {};
  const c = await megaott();
  if (c) {
    const r = await c.createUser({ username, password, packageId: "", expiresAt });
    if (r.ok) {
      remoteMeta = { provider: "megaott", remote_user_id: r.value.providerUserId, m3u_url: r.value.m3uUrl ?? null };
    } else {
      const fallback = await assignLocalAvailableAccount(`megaott_failed:${r.error.kind}`);
      if (fallback) return fallback;
      // No local inventory remains: throw so the workflow is marked failed
      // and retried with backoff. Include upstream status + body snippet so
      // the failed-run UI surfaces a real diagnostic.
      const status = r.error.status ? ` [${r.error.status}]` : "";
      throw new Error(`megaott.createUser failed (${r.error.kind}${status}): ${r.error.message}`);
    }
  }

  const { data, error } = await sb.from("iptv_accounts").insert({
    username,
    password,
    order_id: orderRow?.id ?? null,
    customer_id: orderRow?.customer_id ?? null,
    status: "active",
    expires_at: expiresAt,
    metadata: {
      source: "automation",
      duration_months: input.durationMonths ?? null,
      order_ref: input.orderId ?? null,
      customer_email: input.customerEmail ?? null,
      ...remoteMeta,
    },
  }).select("id").maybeSingle();
  if (error) {
    throw new Error(`iptv_accounts insert failed: ${error.message}`);
  }
  return {
    accountId: data?.id ?? null,
    username,
    password,
    simulated: !c,
    orderId: orderRow?.id ?? null,
    customerId: orderRow?.customer_id ?? null,
    m3uUrl: (remoteMeta as any).m3u_url ?? null,
    remoteUserId: (remoteMeta as any).remote_user_id ?? null,
  };
}

/**
 * Compose the delivery payload after an IPTV subscription has been created.
 * Writes `orders.metadata.iptv_delivery` in the same shape the NCC UI uses
 * (see `IptvDeliveryCard`) and inserts a `delivery_logs` row in
 * `prepared` state so the delivery pipeline can pick it up.
 *
 * This step is what turns "provisioning" into "ready to send" and is what
 * lets the RC1 harness assert the whole chain without a human clicking
 * the "prepare delivery" button in the back-office.
 */
export async function composeIptvDelivery(input: {
  orderRef?: string;
  accountId?: string | null;
}) {
  const sb = await admin();
  if (!input.orderRef) throw new Error("composeIptvDelivery: orderRef manquant");
  if (!input.accountId) return { skipped: true, reason: "no iptv_account_id" };

  const { data: order } = await sb
    .from("orders")
    .select("id, customer_id, email, metadata")
    .eq("order_ref", input.orderRef)
    .maybeSingle();
  if (!order?.id) throw new Error(`composeIptvDelivery: commande ${input.orderRef} introuvable`);

  const { data: account } = await sb
    .from("iptv_accounts")
    .select("*")
    .eq("id", input.accountId)
    .maybeSingle();
  if (!account?.id) throw new Error(`composeIptvDelivery: iptv_account ${input.accountId} introuvable`);

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const { buildDeliveryFromAccount } = await import("@/lib/iptv-delivery.builder");
  const previous = (meta as any).iptv_delivery ?? null;
  const delivery = buildDeliveryFromAccount({ account, order: { ...order, metadata: meta }, previous });
  const nextMeta = { ...meta, iptv_delivery: delivery };
  const { error: upErr } = await sb.from("orders").update({ metadata: nextMeta }).eq("id", order.id);
  if (upErr) throw new Error(`orders.metadata update failed: ${upErr.message}`);

  const { buildPlainTextDeliveryMessage } = await import("@/lib/iptv-delivery.builder");
  const content = buildPlainTextDeliveryMessage(delivery, { orderRef: input.orderRef });

  const { error: dlErr } = await sb.from("delivery_logs").insert({
    order_id: order.id,
    customer_id: order.customer_id ?? null,
    channel: "email",
    status: "prepared",
    template_id: "iptv-delivery",
    subject: `Vos identifiants IPTV — ${input.orderRef}`,
    content,
    recipient: order.email ?? null,
    admin_id: null,
  });
  if (dlErr) throw new Error(`delivery_logs insert failed: ${dlErr.message}`);

  return { orderId: order.id, iptvAccountId: account.id, deliveryStatus: "ready_to_send" as const };
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
/**
 * Envoie la fiche de livraison IPTV via email/whatsapp/telegram.
 * Idempotent (channels_sent). Utilisé par le workflow payment-confirmed.
 */
export async function dispatchIptvDelivery(input: { orderRef?: string; force?: boolean }) {
  if (!input.orderRef) throw new Error("dispatchIptvDelivery: orderRef manquant");
  const { dispatchIptvDeliveryFor } = await import("@/lib/iptv-dispatch.server");
  return dispatchIptvDeliveryFor(input.orderRef, { force: input.force });
}
