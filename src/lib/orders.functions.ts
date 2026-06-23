import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// USD → XAF conversion used when a Mobile Money customer in the CFA franc
// (BEAC) zone pays. Plans are priced in USD on the site; SebPay's Mobile
// Money endpoint expects local currency (XAF for CM/CG/GA/TD/CF).
export const USD_TO_XAF = 600;
const XAF_COUNTRIES = new Set(["CM", "CG", "GA", "TD", "CF"]);

const CreateOrderSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  planId: z.string().trim().min(1).max(40),
  planName: z.string().trim().min(1).max(80),
  amount: z.number().positive().max(100000),
  currency: z.string().trim().length(3).default("USD"),
  method: z.enum(["card", "momo", "crypto"]),
  phone: z.string().trim().min(6).max(20).optional(),
  operator: z.enum(["MTN Mobile Money", "Orange Money"]).optional(),
  country: z.string().trim().length(2).toUpperCase().optional(),
}).refine(
  (d) => d.method !== "momo" || (!!d.phone && !!d.operator && !!d.country),
  { message: "Mobile Money requires phone, operator and country" },
);

function genOrderRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `NX-${s}`;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const order_ref = genOrderRef();

    // For Mobile Money in the XAF zone, override currency + amount to what
    // SebPay actually charges (local CFA franc). The USD price is preserved
    // in metadata for accounting.
    let amount = data.amount;
    let currency = data.currency;
    const metadata: Record<string, unknown> = {};
    if (data.method === "momo") {
      metadata.momo = {
        phone: data.phone,
        operator: data.operator,
        country: data.country,
      };
      metadata.usd_amount = data.amount;
      if (data.country && XAF_COUNTRIES.has(data.country)) {
        currency = "XAF";
        amount = Math.round(data.amount * USD_TO_XAF);
      }
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
    return row;
  });

export const getOrderByRef = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status, sebpay_reference, metadata, created_at, updated_at")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
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
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
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