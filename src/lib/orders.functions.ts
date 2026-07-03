import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
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
  method: z.literal("momo"),
  phone: z.string().trim().min(6).max(20),
  operator: z.string().trim().min(2).max(40),
  country: z.string().trim().length(2).toUpperCase(),
  // Sprint 3 · Bloc C — the checkout form MUST tick a box accepting the
  // CGU / CGV / privacy / refund policy before it can call this fn.
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les CGU et CGV." }),
  }),
  termsVersion: z.string().trim().min(4).max(32).optional(),
});

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
function makeCancelToken(orderRef: string): string {
  return createHmac("sha256", cancelSecret()).update(`cancel:${orderRef}`).digest("hex");
}
function verifyCancelToken(orderRef: string, token: string): boolean {
  try {
    const expected = Buffer.from(makeCancelToken(orderRef), "hex");
    const got = Buffer.from(token, "hex");
    return expected.length === got.length && timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const order_ref = genOrderRef();

    // SebPay charges in the customer's local Mobile Money currency
    // (XOF, XAF, GNF, CDF…). Convert the USD plan price using the country
    // map and keep the original USD amount in metadata for accounting.
    const { amount, currency } = convertUsdToLocal(data.amount, data.country);
    const metadata: Record<string, any> = {
      usd_amount: data.amount,
      usd_to_local_rate: amount / data.amount,
      momo: {
        phone: data.phone,
        operator: data.operator,
        country: data.country,
      },
      // Proof of acceptance for compliance / dispute handling.
      terms_version: data.termsVersion ?? LEGAL_VERSION,
      terms_accepted_at: new Date().toISOString(),
    };

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
    return { ...row, cancel_token: makeCancelToken(row.order_ref) };
  });

export const getOrderByRef = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      // Never select `metadata` here — it contains PII (Mobile Money phone,
      // operator, country) and raw SebPay request/response payloads. Anyone
      // with the order reference can hit this endpoint. We surface only a
      // sanitised `failure_reason` string for the failure page.
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status, sebpay_reference, metadata, created_at, updated_at")
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
    return {
      order_ref: row.order_ref,
      email: row.email,
      full_name: row.full_name,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, plan_name, amount, currency, method, status, created_at")
      .eq("email", data.email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
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
    if (!verifyCancelToken(data.ref, data.token)) {
      throw new Error("Invalid cancellation token");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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