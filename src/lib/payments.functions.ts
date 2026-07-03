import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Sprint 3 · GA-BLOCK-01 — All top-level SebPay helpers have been moved to
// `src/lib/payments-sebpay.server.ts` so no SebPay secret NAME literal
// (SEBPAY_PUBLIC_KEY / SEBPAY_SECRET_KEY) survives in the client bundle.
// Handlers below dynamic-import those helpers; the server-fn Vite plugin
// strips handler bodies from client chunks.
//
// SebPay LIVE integration — https://sebpay.bj/our-api
//   POST  {BASE}/api/v1/collections                 — create a Mobile Money collection
//   GET   {BASE}/api/v1/collections/{id_or_ref}     — verify a collection's status
export const SEBPAY_COLLECTIONS_PATH = "/api/v1/collections";

/**
 * Create a payment with SebPay (POST /api/v1/collections) and return the URL the
 * customer must be redirected to. The order is moved to "processing"; it will
 * only flip to "paid" after verifyPayment / the webhook confirms with SebPay.
 */
export const initSebPayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ref: z.string().min(4).max(40),
        successUrl: z.string().url(),
        failureUrl: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const {
      SEBPAY_BASE_URL,
      SEBPAY_COLLECTIONS_PATH: PATH,
      normalizePhone,
      operatorSlug,
      sebpayFetch,
    } = await import("@/lib/payments-sebpay.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error(`Order is already ${order.status}; cannot start a new checkout.`);
    }

    if (order.method !== "momo") {
      throw new Error("Only Mobile Money (MTN / Orange) is currently supported.");
    }
    const momo = (order.metadata as any)?.momo as
      | { phone?: string; operator?: string; country?: string }
      | undefined;
    if (!momo?.phone || !momo?.operator || !momo?.country) {
      throw new Error(
        "Mobile Money order is missing phone / operator / country — please re-enter your payment details.",
      );
    }

    const callbackUrl = `${new URL(data.successUrl).origin}/api/public/sebpay/webhook`;

    const payload: Record<string, any> = {
      amount: Number(order.amount),
      currency: order.currency,
      phone: normalizePhone(momo.phone),
      operator: operatorSlug(momo.operator),
      country: momo.country,
      external_reference: order.order_ref,
      callback_url: callbackUrl,
    };

    const endpoint = `${SEBPAY_BASE_URL}${PATH}`;
    const { status, raw, json } = await sebpayFetch(PATH, { method: "POST", body: payload });
    if (status < 200 || status >= 300 || !json) {
      const detail =
        (json && (json.message || json.error || json.detail)) ||
        raw.slice(0, 500) ||
        "(empty response body)";
      const fieldErrors =
        json && json.errors ? ` — fields: ${JSON.stringify(json.errors).slice(0, 400)}` : "";
      console.error("[sebpay] create collection failed", { status, endpoint, detail, fieldErrors });
      throw new Error("Le paiement n'a pas pu être initialisé. Veuillez réessayer ou contacter le support.");
    }

    const d = json.data ?? json;
    const sebpayId: string | undefined = d.transaction_id ?? d.id ?? d.reference;
    const providerLink: string | undefined =
      d.provider_link ?? d.payment_url ?? d.checkout_url ?? d.url ?? undefined;
    const sebMessage: string | undefined = d.message ?? json.message;
    const sebStatus: string | undefined = d.status ?? json.status;
    if (!sebpayId) {
      throw new Error(`SebPay did not return a transaction_id. Raw response: ${raw.slice(0, 500)}`);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        sebpay_reference: sebpayId,
        metadata: {
          ...((order.metadata as any) ?? {}),
          sebpay_endpoint: endpoint,
          sebpay_request: payload,
          sebpay_response: json,
          sebpay_provider_link: providerLink ?? null,
          sebpay_initial_status: sebStatus ?? null,
        },
      })
      .eq("order_ref", order.order_ref);

    return {
      transactionId: sebpayId,
      providerLink: providerLink ?? null,
      status: sebStatus ?? "pending",
      message: sebMessage ?? null,
    };
  });

/**
 * Verify a payment with SebPay (GET /api/v1/collections/{id}).
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => verifyPaymentInternal(data.ref));

export async function verifyPaymentInternal(ref: string): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const {
    SEBPAY_COLLECTIONS_PATH: PATH,
    sebpayFetch,
    mapSebpayStatus,
  } = await import("@/lib/payments-sebpay.server");
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("order_ref, status, sebpay_reference, metadata")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };

  if (["paid", "failed", "cancelled"].includes(order.status)) {
    return { status: order.status };
  }
  if (!order.sebpay_reference) {
    return { status: order.status };
  }

  const { status: httpStatus, raw, json } = await sebpayFetch(
    `${PATH}/${encodeURIComponent(order.sebpay_reference)}`,
    { method: "GET" },
  );
  if (httpStatus < 200 || httpStatus >= 300 || !json) {
    console.error("[sebpay] verify failed", { ref, httpStatus, raw: raw.slice(0, 300) });
    return { status: order.status };
  }

  const d = json.data ?? json;
  const sebStatus = d.status ?? json.status ?? json.payment_status;
  const mapped = mapSebpayStatus(sebStatus);
  if (mapped === "pending") return { status: "processing" };

  const { data: updatedRows } = await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      metadata: {
        ...((order.metadata as any) ?? {}),
        sebpay_verify_response: json,
        sebpay_verified_status: sebStatus,
        verified_at: new Date().toISOString(),
      },
    })
    .eq("order_ref", ref)
    .in("status", ["pending", "processing"])
    .select("order_ref, email, plan_name, amount, currency");

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0;
  if (transitioned) {
    const row = updatedRows[0]!;
    if (mapped === "paid") {
      try {
        const { reactivateAccountsForOrder } = await import("@/lib/billing.server");
        const { data: internal } = await supabaseAdmin
          .from("orders").select("id").eq("order_ref", ref).maybeSingle();
        if (internal?.id) {
          await reactivateAccountsForOrder(internal.id, { source: "payment.verify" });
        }
      } catch (e) {
        console.error("[billing] reactivation on payment failed", e);
      }
    }
    await emitBusinessEvent(
      mapped === "paid" ? "payment.confirmed" : mapped === "failed" ? "payment.failed" : null,
      {
        orderId: row.order_ref,
        orderRef: row.order_ref,
        email: row.email,
        planName: row.plan_name,
        amount: row.amount,
        currency: row.currency,
        sebpayStatus: sebStatus,
      },
    );
  }

  return { status: mapped };
}

/**
 * Emit a business event into the automation queue. Failures are logged and
 * swallowed — payment processing must never fail because the automation
 * queue is temporarily unavailable.
 */
export async function emitBusinessEvent(
  event: "payment.confirmed" | "payment.failed" | "order.created" | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!event) return;
  try {
    await import("@/automation");
    const { automationApi } = await import("@/automation");
    const ref = String((payload as any).orderRef ?? (payload as any).orderId ?? "");
    const idempotencyKey = ref ? `${event}:${ref}` : null;
    await automationApi.emit(event, payload, { sync: false, idempotencyKey });
  } catch (e: any) {
    console.error("[automation] emit failed", { event, message: String(e?.message ?? e) });
  }
}

// =========================================================================
// Binance Pay — Semi-automatique (QR + preuve client + validation admin)
//
// Aucun secret Binance, aucun webhook, aucune API Merchant.
// Le client scanne le QR statique "Nexora Smart Services", paie manuellement,
// puis renvoie la preuve (TXID, screenshot). Un admin approuve dans la NCC,
// ce qui déclenche exactement le même workflow de livraison IPTV que SebPay.
//
// Ce module est isolé : quand on branchera la Merchant API officielle, il
// suffira d'ajouter un `initBinancePayCheckout` + webhook et de garder
// `approveBinancePayment` comme point d'entrée du workflow de livraison.
// =========================================================================

const BinanceProofSchema = z.object({
  ref: z.string().trim().min(4).max(40),
  accountName: z.string().trim().min(2).max(120),
  binanceUid: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  transactionId: z.string().trim().min(4).max(120),
  // Screenshot facultatif encodé en data-URL (image/png|jpeg|webp, ≤ 3 MB).
  screenshotDataUrl: z.string().max(4_500_000).optional(),
});

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const buffer = Buffer.from(m[2]!, "base64");
    if (buffer.byteLength > 3 * 1024 * 1024) return null;
    return { mime: m[1]!, buffer };
  } catch {
    return null;
  }
}

/**
 * Soumet la preuve de paiement Binance côté client (public). La commande
 * passe en `awaiting_verification` : elle attend qu'un admin l'approuve
 * dans la NCC — la livraison IPTV n'est PAS déclenchée avant approbation.
 */
export const submitBinanceProof = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BinanceProofSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, status, method, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Commande introuvable.");
    if (order.method !== "crypto") throw new Error("Cette commande n'est pas un paiement crypto.");
    if (order.status !== "pending" && order.status !== "awaiting_verification") {
      throw new Error(`Cette commande est déjà au statut « ${order.status} ».`);
    }

    // Upload du screenshot dans le bucket privé `binance-proofs` (si fourni).
    let screenshotPath: string | null = null;
    if (data.screenshotDataUrl) {
      const parsed = parseDataUrl(data.screenshotDataUrl);
      if (!parsed) {
        throw new Error("Capture d'écran invalide (formats acceptés : PNG, JPEG, WEBP ≤ 3 Mo).");
      }
      const ext = parsed.mime === "image/jpeg" ? "jpg" : parsed.mime === "image/webp" ? "webp" : "png";
      const path = `${order.order_ref}/${Date.now()}.${ext}`;
      const { error: upErr } = await (supabaseAdmin as any).storage
        .from("binance-proofs")
        .upload(path, parsed.buffer, { contentType: parsed.mime, upsert: false });
      if (upErr) {
        console.error("[binance-proof] upload failed", upErr);
        throw new Error("Le téléversement de la capture a échoué. Réessayez sans image ou avec un fichier plus léger.");
      }
      screenshotPath = path;
    }

    const meta = (order.metadata as Record<string, any>) ?? {};
    const submittedAt = new Date().toISOString();
    await supabaseAdmin
      .from("orders")
      .update({
        status: "awaiting_verification",
        metadata: {
          ...meta,
          binance_manual: {
            provider: "binance_pay_manual",
            account_name: data.accountName,
            binance_uid: data.binanceUid ?? null,
            transaction_id: data.transactionId,
            screenshot_path: screenshotPath,
            submitted_at: submittedAt,
          },
        },
      })
      .eq("order_ref", order.order_ref);

    return { ok: true as const, status: "awaiting_verification" as const, submittedAt };
  });

/**
 * Admin — valide manuellement un paiement Binance en attente, ce qui déclenche
 * exactement la même chaîne que la confirmation SebPay :
 *  1. status → "paid" (avec trace de l'admin approbateur)
 *  2. `reactivateAccountsForOrder` (livraison IPTV / renouvellement)
 *  3. `emitBusinessEvent("payment.confirmed")` (emails, notifications, timeline)
 */
export const approveBinancePayment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({
      ref: z.string().trim().min(4).max(40),
      notes: z.string().trim().max(500).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_ref, status, method, email, plan_name, amount, currency, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Commande introuvable.");
    if (order.method !== "crypto") throw new Error("Cette commande n'est pas un paiement crypto.");
    if (order.status === "paid") return { ok: true as const, alreadyPaid: true };
    if (order.status !== "awaiting_verification") {
      throw new Error(`Impossible d'approuver une commande au statut « ${order.status} ».`);
    }

    const meta = (order.metadata as Record<string, any>) ?? {};
    const { error: upErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        metadata: {
          ...meta,
          binance_manual: {
            ...(meta.binance_manual ?? {}),
            approved_by: (context as any)?.userId ?? null,
            approved_at: new Date().toISOString(),
            approval_notes: data.notes ?? null,
          },
        },
      })
      .eq("id", order.id)
      .eq("status", "awaiting_verification");
    if (upErr) throw new Error(upErr.message);

    // Déclenche la livraison IPTV — même chemin que verifyPaymentInternal.
    try {
      const { reactivateAccountsForOrder } = await import("@/lib/billing.server");
      await reactivateAccountsForOrder(order.id, { source: "payment.binance.manual_approve" });
    } catch (e) {
      console.error("[billing] reactivation on manual binance approval failed", e);
    }
    await emitBusinessEvent("payment.confirmed", {
      orderId: order.order_ref,
      orderRef: order.order_ref,
      email: order.email,
      planName: order.plan_name,
      amount: order.amount,
      currency: order.currency,
      provider: "binance_pay_manual",
    });

    return { ok: true as const };
  });

/** Admin — refuse un paiement Binance en attente. */
export const rejectBinancePayment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({
      ref: z.string().trim().min(4).max(40),
      reason: z.string().trim().min(2).max(500),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_ref, status, method, email, plan_name, amount, currency, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Commande introuvable.");
    if (order.method !== "crypto") throw new Error("Cette commande n'est pas un paiement crypto.");
    if (order.status !== "awaiting_verification" && order.status !== "pending") {
      throw new Error(`Impossible de refuser une commande au statut « ${order.status} ».`);
    }

    const meta = (order.metadata as Record<string, any>) ?? {};
    await supabaseAdmin
      .from("orders")
      .update({
        status: "failed",
        metadata: {
          ...meta,
          failure_reason: data.reason,
          binance_manual: {
            ...(meta.binance_manual ?? {}),
            rejected_by: (context as any)?.userId ?? null,
            rejected_at: new Date().toISOString(),
            rejection_reason: data.reason,
          },
        },
      })
      .eq("id", order.id)
      .in("status", ["pending", "awaiting_verification"]);

    await emitBusinessEvent("payment.failed", {
      orderId: order.order_ref,
      orderRef: order.order_ref,
      email: order.email,
      planName: order.plan_name,
      amount: order.amount,
      currency: order.currency,
      provider: "binance_pay_manual",
      reason: data.reason,
    });

    return { ok: true as const };
  });

/** Admin — liste les paiements Binance en attente de vérification, plus récents en tête. */
export const listBinanceAwaiting = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, plan_name, amount, currency, status, metadata, created_at, updated_at")
      .eq("method", "crypto")
      .in("status", ["awaiting_verification", "pending"])
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const meta = (row.metadata as Record<string, any>) ?? {};
      const bm = (meta.binance_manual ?? {}) as Record<string, any>;
      return {
        order_ref: row.order_ref,
        email: row.email,
        full_name: row.full_name,
        plan_name: row.plan_name,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        account_name: bm.account_name ?? null,
        binance_uid: bm.binance_uid ?? null,
        transaction_id: bm.transaction_id ?? null,
        screenshot_path: bm.screenshot_path ?? null,
        submitted_at: bm.submitted_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  });

/** Admin — URL signée temporaire vers la capture d'écran d'une preuve Binance. */
export const getBinanceProofScreenshotUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => z.object({ ref: z.string().trim().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const path = (order?.metadata as any)?.binance_manual?.screenshot_path as string | null | undefined;
    if (!path) return { url: null };
    const { data: signed, error: sErr } = await (supabaseAdmin as any).storage
      .from("binance-proofs")
      .createSignedUrl(path, 300);
    if (sErr) throw new Error(sErr.message);
    return { url: signed?.signedUrl ?? null };
  });
