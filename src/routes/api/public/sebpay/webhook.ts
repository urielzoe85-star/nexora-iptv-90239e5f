import { createFileRoute } from "@tanstack/react-router";

// SebPay webhook receiver.
// Configure this URL in your SebPay dashboard. We accept either a "ref"/"order_ref"
// field (our generated order reference) and a status from SebPay.
// Set SEBPAY_WEBHOOK_SECRET in your project secrets to enforce signature checks.
export const Route = createFileRoute("/api/public/sebpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        const secret = process.env.SEBPAY_WEBHOOK_SECRET;
        if (secret) {
          const sig = request.headers.get("x-sebpay-signature") ?? "";
          const { createHmac, timingSafeEqual } = await import("crypto");
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

        const ref: string | undefined = payload.ref ?? payload.order_ref ?? payload.reference;
        const rawStatus: string = (payload.status ?? payload.event ?? "").toString().toLowerCase();
        const sebpayReference: string | undefined =
          payload.transaction_id ?? payload.transactionId ?? payload.id;

        if (!ref || !rawStatus) return new Response("Missing ref/status", { status: 400 });

        const status =
          ["success", "succeeded", "paid", "completed"].includes(rawStatus) ? "paid"
          : ["failed", "declined", "error"].includes(rawStatus) ? "failed"
          : ["cancelled", "canceled"].includes(rawStatus) ? "cancelled"
          : null;
        if (!status) return new Response("Unhandled status", { status: 202 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({ status, sebpay_reference: sebpayReference ?? null, metadata: payload })
          .eq("order_ref", ref);
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});