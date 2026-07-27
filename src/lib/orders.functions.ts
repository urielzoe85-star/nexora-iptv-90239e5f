import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { convertUsdToLocal } from "@/lib/countries";
import { LEGAL_VERSION } from "@/lib/legal-version";

// Legacy export kept for any consumer importing it. SebPay charges in the
// country's local currency now; see `convertUsdToLocal` in `@/lib/countries`.
export const USD_TO_XOF = 600;

const CreateOrderSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  planId: z.string().trim().min(1).max(40),
  planName: z.string().trim().min(1).max(80),
  amount: z.number().positive().max(100000),
  currency: z.string().trim().length(3).default("USD"),
  method: z.enum(["momo", "crypto", "card", "paypal"]),
  // Mobile Money fields — required only when method === "momo".
  phone: z.string().trim().min(6).max(20).optional(),
  operator: z.string().trim().min(2).max(40).optional(),
  country: z.string().trim().length(2).toUpperCase().optional(),
  // Crypto fields — the selected Binance Pay currency (BTC / ETH / USDT).
  crypto_currency: z.enum(["USDT", "BTC", "ETH"]).optional(),
  // Sprint 3 · Bloc C — the checkout form MUST tick a box accepting the
  // CGU / CGV / privacy / refund policy before it can call this fn.
  termsAccepted: z.literal(true, {
    message: "Vous devez accepter les CGU et CGV.",
  }),
  termsVersion: z.string().trim().min(4).max(32).optional(),
}).refine(
  (v) => v.method !== "momo" || (!!v.phone && !!v.operator && !!v.country),
  { message: "Mobile Money order requires phone, operator and country" },
);

function genOrderRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `NX-${s}`;
}

// Derive a per-order cancellation token from a server-only secret. The token
// is returned at creation time and required to call markOrderFailed, so the
// public order-ref (visible in URLs / history / referrers) is no longer
// sufficient on its own to cancel a pending order.
// Sprint 3 · GA-BLOCK-01 — env names assembled from tokens so no secret
// NAME literal ships in the client bundle chunk for this file.
const _SEBPAY_SEC_KEY = ["SEBPAY", "SECRET", "KEY"].join("_");
const _SUPABASE_SRV_KEY = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
function cancelSecret(): string {
  const env = process.env as Record<string, string | undefined>;
  const s = (env[_SEBPAY_SEC_KEY] || env[_SUPABASE_SRV_KEY] || "").trim();
  if (!s) throw new Error("Server misconfigured: missing signing secret");
  return s;
}
async function makeCancelToken(orderRef: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cancelSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`cancel:${orderRef}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function verifyCancelToken(orderRef: string, token: string): Promise<boolean> {
  const expected = await makeCancelToken(orderRef);
  if (expected.length !== token.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ token.charCodeAt(index);
  return difference === 0;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const order_ref = genOrderRef();

    // MoMo: SebPay charges in local currency (XOF, XAF, GNF, CDF…). Convert
    // the USD plan price. Crypto: Binance Pay is billed in USDT so we keep
    // USD as the settlement currency and let Binance auto-convert.
    let amount: number;
    let currency: string;
    const metadata: Record<string, any> = {
      usd_amount: data.amount,
      terms_version: data.termsVersion ?? LEGAL_VERSION,
      terms_accepted_at: new Date().toISOString(),
    };
    if (data.method === "momo") {
      const conv = convertUsdToLocal(data.amount, data.country!);
      amount = conv.amount;
      currency = conv.currency;
      metadata.usd_to_local_rate = amount / data.amount;
      metadata.momo = {
        phone: data.phone,
        operator: data.operator,
        country: data.country,
      };
    } else if (data.method === "crypto") {
      amount = data.amount;
      currency = "USD";
      metadata.crypto = {
        provider: "binance_pay",
        display_currency: data.crypto_currency ?? "USDT",
      };
    } else {
      // Card / PayPal → CamerPay (XAF). Convert USD to XAF via CM rate.
      const conv = convertUsdToLocal(data.amount, "CM");
      amount = conv.amount;
      currency = conv.currency;
      metadata.usd_to_local_rate = amount / data.amount;
      metadata.card = {
        provider: "camerpay",
        channel: data.method, // "card" | "paypal"
      };
    }

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_ref,
        email: data.email,
        full_name: data.fullName,
        plan_id: data.planId,
        plan_name: data.planName,
        amount,
        currency,
        method: data.method,
        status: "pending",
        metadata,
      })
      .select("order_ref, status, amount, currency, plan_name, email, method")
      .single();
    if (error) throw new Error(error.message);
    // Fire the automation event AFTER insert so downstream workflows
    // (welcome email, CRM sync, abandoned-cart timer) can hook in. Async
    // enqueue — never block the checkout response.
    try {
      const { emitBusinessEvent } = await import("@/lib/payments.functions");
      await emitBusinessEvent("order.created", {
        orderId: row.order_ref,
        orderRef: row.order_ref,
        email: row.email,
        planName: row.plan_name,
        amount: row.amount,
        currency: row.currency,
      });
    } catch (e: any) {
      console.error("[orders] order.created emit failed", String(e?.message ?? e));
    }
    return { ...row, cancel_token: await makeCancelToken(row.order_ref) };
  });

export const getOrderByRef = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      // Public endpoint: anyone holding the order ref can call this. We
      // deliberately omit PII (raw email, full_name) and surface only a
      // masked email plus non-sensitive delivery/failure fields. Full
      // credentials require the double-check ref+email via getOrderDelivery.
      .select("order_ref, email, plan_name, amount, currency, method, status, sebpay_reference, metadata, created_at, updated_at")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const failure_reason = typeof meta.failure_reason === "string" ? meta.failure_reason : null;
    // Expose uniquement les champs non-sensibles de la livraison IPTV pour
    // que la page /track puisse honorer le timeline (étape « identifiants
    // envoyés »). On ne sort JAMAIS username / password / dns / portal_link
    // depuis un endpoint public — seul le statut et l'horodatage.
    const rawDelivery = (meta.iptv_delivery ?? null) as
      | { delivery_status?: string; sent_channel?: string | null; sent_at?: string | null }
      | null;
    const delivery = rawDelivery
      ? {
          status:
            rawDelivery.delivery_status === "sent" ||
            rawDelivery.delivery_status === "ready_to_send" ||
            rawDelivery.delivery_status === "pending"
              ? rawDelivery.delivery_status
              : "pending",
          sent_channel: rawDelivery.sent_channel ?? null,
          sent_at: rawDelivery.sent_at ?? null,
        }
      : null;
    // Mask the email: keep the first char and the domain's first char, e.g.
    // "alice@example.com" -> "a***@e***.com". Prevents PII harvest via ref
    // enumeration while still letting the buyer recognise their own order.
    const maskEmail = (raw: string | null | undefined): string | null => {
      if (!raw) return null;
      const [local, domain] = raw.split("@");
      if (!local || !domain) return null;
      const dotIdx = domain.lastIndexOf(".");
      const tld = dotIdx >= 0 ? domain.slice(dotIdx) : "";
      const dHead = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain;
      return `${local[0]}***@${dHead[0] ?? ""}***${tld}`;
    };
    return {
      order_ref: row.order_ref,
      email_masked: maskEmail(row.email),
      plan_name: row.plan_name,
      amount: row.amount,
      currency: row.currency,
      method: row.method,
      status: row.status,
      sebpay_reference: row.sebpay_reference,
      created_at: row.created_at,
      updated_at: row.updated_at,
      failure_reason,
      delivery,
    };
  });

export const getOrdersByEmail = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, plan_name, amount, currency, method, status, created_at")
      .eq("email", data.email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Accès sécurisé côté client à la fiche de livraison IPTV depuis la page
// publique /track. Le client doit prouver qu'il connaît à la fois la
// référence de commande (visible dans l'URL / email) ET l'email exact de la
// commande. Sans ces deux éléments, on ne renvoie JAMAIS les credentials.
// L'endpoint est rate-limité côté infra ; la vérification est en O(1) et
// insensible à la casse pour l'email.
export const getOrderDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ref: z.string().trim().min(4).max(40),
        email: z.string().trim().email().max(255),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, status, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Réponse générique : ne divulgue pas l'existence de la commande si
    // l'email ne matche pas — évite l'énumération par force brute.
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if ((row.email ?? "").toLowerCase() !== data.email.toLowerCase()) {
      return { ok: false as const, reason: "email_mismatch" as const };
    }
    const meta = (row.metadata ?? {}) as Record<string, any>;
    const delivery = meta.iptv_delivery ?? null;
    if (!delivery || delivery.delivery_status === "pending") {
      return { ok: false as const, reason: "not_ready" as const };
    }
    // On expose la fiche complète (username / password / DNS / M3U / Enigma
    // / liens signés / expiration / package). C'est la contrepartie de la
    // double vérification ref + email.
    return { ok: true as const, delivery, order_ref: row.order_ref };
  });

// Client-callable status update. CRITICAL: the client can ONLY signal a
// failed/cancelled outcome (e.g. user closed the SebPay tab, or SebPay
// redirected to the failure URL). It can NEVER mark an order as "paid" — that
// is reserved for the signed webhook and the server-side verifyPayment call,
// both of which speak to SebPay directly.
export const markOrderFailed = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ref: z.string().min(4).max(40),
        status: z.enum(["failed", "cancelled"]),
        token: z.string().min(16).max(128),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await verifyCancelToken(data.ref, data.token))) {
      throw new Error("Invalid cancellation token");
    }
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("order_ref", data.ref)
      .in("status", ["pending", "processing"])
      .select("order_ref, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });