import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { convertUsdToLocal } from "@/lib/countries";

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
});

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