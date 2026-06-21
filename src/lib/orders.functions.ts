import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CreateOrderSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  planId: z.string().trim().min(1).max(40),
  planName: z.string().trim().min(1).max(80),
  amount: z.number().positive().max(100000),
  currency: z.string().trim().length(3).default("USD"),
  method: z.enum(["card", "momo", "crypto"]),
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
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_ref,
        email: data.email,
        full_name: data.fullName,
        plan_id: data.planId,
        plan_name: data.planName,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        status: "pending",
      })
      .select("order_ref, status, amount, currency, plan_name, email")
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
      .select("order_ref, email, full_name, plan_name, amount, currency, method, status, sebpay_reference, created_at")
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

// Public mark-status. SebPay redirect lands on success/failed page; the page calls this
// to flip status. A signed webhook (api/public/sebpay/webhook) is the source of truth.
export const finalizeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      ref: z.string().min(4).max(40),
      status: z.enum(["paid", "failed", "cancelled"]),
      sebpayReference: z.string().max(120).optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only allow transitioning from "pending" to prevent client tampering of already-final orders.
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: data.status,
        sebpay_reference: data.sebpayReference ?? null,
      })
      .eq("order_ref", data.ref)
      .eq("status", "pending")
      .select("order_ref, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });