/* eslint-disable @typescript-eslint/no-explicit-any -- legacy Supabase row shapes are incrementally typed. */
// Actions IPTV — passent par l'Integration Hub (v1.5).
// Les commandes payées sont provisionnées à distance via MEGAOTT. Le mode
// local n'est disponible que sur opt-in explicite pour les tests.

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  return supabaseAdmin as any;
}

async function megaott() {
  await import("@/integration-hub");
  const { connectorRegistry } = await import("@/integration-hub/core/registry");
  const c = connectorRegistry.get("iptv.megaott") as any;
  if (!c?.isReady?.()) return null;
  if (String(process.env.MEGAOTT_MOCK_MODE ?? "").toLowerCase() === "true") return c;
  // Extra async gate: the connector's isReady() only checks the secret, but
  // a real workflow may call MegaOTT only when an active provider row exists.
  // Disabling every MegaOTT row therefore leaves paid orders pending instead
  // of silently delivering a local account.
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

function mockProvisioningEnabled() {
  return String(process.env.MEGAOTT_MOCK_MODE ?? "").toLowerCase() === "true";
}

type ProvisioningState =
  | "pending"
  | "processing"
  | "provisioned"
  | "failed"
  | "retrying"
  | "manual_review";

function safeProvisioningError(message: unknown) {
  return String(message ?? "")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer ***")
    .replace(/[A-Za-z0-9_-]{32,}/g, "***")
    .slice(0, 500);
}

async function setProvisioningState(
  sb: any,
  orderRef: string | undefined,
  state: ProvisioningState,
  error?: unknown,
  options: { providerCreationPossible?: boolean } = {},
) {
  if (!orderRef) return;
  const { data: order } = await sb
    .from("orders")
    .select("id, metadata")
    .eq("order_ref", orderRef)
    .maybeSingle();
  if (!order?.id) return;
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const previous = (meta.iptv_provisioning ?? {}) as Record<string, any>;
  const attempts =
    state === "processing" ? Number(previous.attempts ?? 0) + 1 : Number(previous.attempts ?? 0);
  const correlationId = String(
    previous.correlation_id ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`,
  );
  const safeError = error ? safeProvisioningError(error) : null;
  await sb
    .from("orders")
    .update({
      metadata: {
        ...meta,
        iptv_provisioning: {
          ...previous,
          state,
          updated_at: new Date().toISOString(),
          attempts,
          correlation_id: correlationId,
          ...(safeError
            ? { error: safeError, last_error: safeError }
            : { error: null, last_error: null }),
          ...(state === "manual_review"
            ? {
                manual_review_reason: options.providerCreationPossible
                  ? "possible_provider_side_creation"
                  : (safeError ?? "manual_review"),
              }
            : {}),
          ...(options.providerCreationPossible ? { provider_creation_possible: true } : {}),
        },
      },
    })
    .eq("id", order.id);
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
  let orderRow: {
    id: string;
    customer_id: string | null;
    email?: string | null;
    metadata?: any;
    plan_id?: string | null;
  } | null = null;
  if (input.orderId) {
    const { data } = await sb
      .from("orders")
      .select("id, customer_id, email, metadata, plan_id")
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
  let expiresAt = input.durationMonths
    ? new Date(Date.now() + input.durationMonths * 30 * 86_400_000).toISOString()
    : null;
  await setProvisioningState(sb, input.orderId, "processing");

  async function assignLocalAvailableAccount(reason: string) {
    const { data: candidates, error } = await sb
      .from("iptv_accounts")
      .select("*")
      .eq("status", "available")
      .is("order_id", null)
      .limit(50);
    if (error) throw new Error(`iptv_accounts local pool lookup failed: ${error.message}`);
    const now = Date.now();
    const pool = ((candidates ?? []) as any[])
      .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
      .sort((a, b) => {
        const ax = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
        const bx = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
        return bx - ax;
      });
    const picked = pool[0];
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

  const c = await megaott();
  if (c) {
    const { resolveMegaottConfig } =
      await import("@/integration-hub/connectors/iptv/megaott.adapter");
    const cfg = await resolveMegaottConfig();
    if (!cfg.ok) {
      const safe = safeProvisioningError(cfg.error.message);
      await setProvisioningState(sb, input.orderId, "manual_review", safe);
      throw new Error(`MEGAOTT configuration unavailable: ${safe}`);
    }
    let packageId: string | null = null;
    let mappedDurationMonths: number | null = input.durationMonths ?? null;
    let mappedMaxConnections: number | null = null;
    if (input.orderId && orderRow?.plan_id) {
      const { data: mapping, error: mappingError } = await sb
        .from("iptv_provider_plan_mappings")
        .select("provider_package_id, duration_months, max_connections")
        .eq("provider", "megaott")
        .eq("plan_id", orderRow.plan_id)
        .eq("enabled", true)
        .maybeSingle();
      if (mappingError) {
        const safe = safeProvisioningError(mappingError.message);
        await setProvisioningState(sb, input.orderId, "manual_review", safe);
        throw new Error(`MEGAOTT mapping unavailable: ${safe}`);
      }
      packageId = mapping?.provider_package_id ? String(mapping.provider_package_id) : null;
      mappedDurationMonths = mapping?.duration_months ? Number(mapping.duration_months) : null;
      mappedMaxConnections = mapping?.max_connections ? Number(mapping.max_connections) : null;
      if (!expiresAt && mappedDurationMonths) {
        expiresAt = new Date(Date.now() + mappedDurationMonths * 30 * 86_400_000).toISOString();
      }
    } else if (!input.orderId) {
      // Non-order/manual callers may explicitly supply a package. The paid
      // order workflow always takes the durable plan mapping branch above.
      packageId = cfg.value.defaultPackageId ?? null;
    }
    if (!packageId) {
      await setProvisioningState(sb, input.orderId, "manual_review", "package_id absent");
      throw new Error(
        "MEGAOTT mapping package_id absent: paiement conservé en attente de provisioning",
      );
    }
    const r = await c.createUser({
      username,
      packageId,
      expiresAt,
      metadata: {
        note: `NEXORA ${input.orderId ?? ""}`.trim(),
        ...(mappedMaxConnections ? { max_connections: mappedMaxConnections } : {}),
      },
    });
    if (!r.ok) {
      const status = r.error.status ? ` [${r.error.status}]` : "";
      // A 5xx/timeout after POST is ambiguous: MegaOTT may have created the
      // line before the response was lost. Keep it in manual_review instead
      // of risking a duplicate; only explicit rate limiting is auto-retried.
      const retryable = r.error.kind === "rate_limited";
      const safe = safeProvisioningError(r.error.message);
      const providerCreationPossible =
        !retryable &&
        (r.error.kind === "timeout" ||
          r.error.kind === "network" ||
          r.error.kind === "provider" ||
          Number(r.error.status ?? 0) >= 500);
      await setProvisioningState(
        sb,
        input.orderId,
        retryable ? "retrying" : "manual_review",
        safe,
        { providerCreationPossible },
      );
      throw new Error(`megaott.createUser failed (${r.error.kind}${status}): ${safe}`);
    }
    const remoteMeta = {
      source: "automation",
      provider: "megaott",
      remote_user_id: r.value.providerUserId,
      m3u_url: r.value.m3uUrl ?? null,
      dns_link: r.value.dnsLink ?? null,
      portal_link: r.value.portalLink ?? null,
      package_id: r.value.packageId ?? packageId,
      last_sync_at: new Date().toISOString(),
      duration_months: mappedDurationMonths,
      order_ref: input.orderId ?? null,
      customer_email: input.customerEmail ?? null,
    };
    const { data, error } = await sb
      .from("iptv_accounts")
      .insert({
        username: r.value.username || username,
        password: r.value.password ?? password,
        megaott_subscription_id: r.value.providerUserId,
        order_id: orderRow?.id ?? null,
        customer_id: orderRow?.customer_id ?? null,
        status: "active",
        expires_at: r.value.expiresAt ?? expiresAt,
        metadata: remoteMeta,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      await setProvisioningState(sb, input.orderId, "manual_review", error.message, {
        providerCreationPossible: true,
      });
      throw new Error(`iptv_accounts insert failed: ${error.message}`);
    }
    await setProvisioningState(sb, input.orderId, "provisioned");
    return {
      accountId: data?.id ?? null,
      username: r.value.username || username,
      password: r.value.password ?? password,
      simulated: false,
      orderId: orderRow?.id ?? null,
      customerId: orderRow?.customer_id ?? null,
      m3uUrl: r.value.m3uUrl ?? null,
      remoteUserId: r.value.providerUserId,
    };
  }

  if (!mockProvisioningEnabled()) {
    await setProvisioningState(sb, input.orderId, "manual_review", "MEGAOTT non configuré");
    throw new Error(
      "MEGAOTT non configuré: paiement confirmé, provisioning en attente (aucune livraison locale simulée)",
    );
  }

  const localMock = await assignLocalAvailableAccount("mock_mode");
  if (localMock) {
    await setProvisioningState(sb, input.orderId, "provisioned");
    return { ...localMock, simulated: true };
  }

  const { data, error } = await sb
    .from("iptv_accounts")
    .insert({
      username,
      password,
      order_id: orderRow?.id ?? null,
      customer_id: orderRow?.customer_id ?? null,
      status: "active",
      expires_at: expiresAt,
      metadata: {
        source: "mock",
        duration_months: input.durationMonths ?? null,
        order_ref: input.orderId ?? null,
        customer_email: input.customerEmail ?? null,
      },
    })
    .select("id")
    .maybeSingle();
  if (error) {
    await setProvisioningState(sb, input.orderId, "failed", error.message);
    throw new Error(`iptv_accounts insert failed: ${error.message}`);
  }
  await setProvisioningState(sb, input.orderId, "provisioned");
  return {
    accountId: data?.id ?? null,
    username,
    password,
    simulated: true,
    orderId: orderRow?.id ?? null,
    customerId: orderRow?.customer_id ?? null,
    m3uUrl: null,
    remoteUserId: null,
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
export async function composeIptvDelivery(input: { orderRef?: string; accountId?: string | null }) {
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
  if (!account?.id)
    throw new Error(`composeIptvDelivery: iptv_account ${input.accountId} introuvable`);

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const { buildDeliveryFromAccount } = await import("@/lib/iptv-delivery.builder");
  const previous = (meta as any).iptv_delivery ?? null;
  const delivery = buildDeliveryFromAccount({
    account,
    order: { ...order, metadata: meta },
    previous,
  });
  const nextMeta = { ...meta, iptv_delivery: delivery };
  const { error: upErr } = await sb
    .from("orders")
    .update({ metadata: nextMeta })
    .eq("id", order.id);
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
  const { data: acc } = await sb
    .from("iptv_accounts")
    .select("metadata")
    .eq("id", accountId)
    .maybeSingle();
  const remoteId = (acc?.metadata as any)?.remote_user_id;
  const c = await megaott();
  if (c && remoteId) {
    const r = await c.extend(remoteId, next.toISOString());
    if (!r.ok) throw new Error(`MEGAOTT renewal failed: ${safeProvisioningError(r.error.message)}`);
    if (r.value.expiresAt) next.setTime(new Date(r.value.expiresAt).getTime());
  } else if (!mockProvisioningEnabled()) {
    throw new Error("MEGAOTT renewal unavailable: remote subscription is not configured");
  }
  const { error } = await sb
    .from("iptv_accounts")
    .update({ expires_at: next.toISOString(), status: "active" })
    .eq("id", accountId);
  if (error) throw new Error(`iptv_accounts renewal update failed: ${error.message}`);
  return { accountId, expiresAt: next.toISOString(), remote: Boolean(c && remoteId) };
}

export async function setIptvSubscriptionStatus(
  accountId: string,
  status: "active" | "suspended" | "expired",
) {
  const sb = await admin();
  const { data: acc } = await sb
    .from("iptv_accounts")
    .select("metadata")
    .eq("id", accountId)
    .maybeSingle();
  const remoteId = (acc?.metadata as any)?.remote_user_id;
  const c = await megaott();
  if (c && remoteId) {
    const r =
      status === "suspended"
        ? await c.suspendUser(remoteId)
        : status === "active"
          ? await c.reactivateUser(remoteId)
          : { ok: true };
    if (!(r as any).ok)
      throw new Error(
        `MEGAOTT status update failed: ${safeProvisioningError((r as any).error?.message)}`,
      );
  } else if (!mockProvisioningEnabled()) {
    throw new Error("MEGAOTT status update unavailable: remote subscription is not configured");
  }
  const { error } = await sb.from("iptv_accounts").update({ status }).eq("id", accountId);
  if (error) throw new Error(`iptv_accounts status update failed: ${error.message}`);
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
