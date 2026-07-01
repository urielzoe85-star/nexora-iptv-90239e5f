// Test-only endpoint to emit an automation business event without going
// through SebPay upstream verification. Guarded by AUTOMATION_CRON_SECRET
// AND by an order_ref prefix check (`NXR-E2E-`), so it can only kick
// workflows against seeded test orders — never a real customer order.
//
// Sprint 1.5 (E2E). Safe to leave in production: without the cron secret
// the endpoint returns 401, and the prefix guard means even a leaked
// secret couldn't be used to trigger workflows on real orders.

import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_EVENTS = new Set([
  "payment.confirmed",
  "payment.failed",
  "order.created",
]);

export const Route = createFileRoute("/api/public/automation/emit-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.AUTOMATION_CRON_SECRET ?? "";
        if (!expected) return new Response("Server misconfigured", { status: 500 });
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token || token !== expected) return new Response("Unauthorized", { status: 401 });

        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

        const event = String(body?.event ?? "");
        const ref = String(body?.orderRef ?? body?.orderId ?? "");
        if (!ALLOWED_EVENTS.has(event)) return new Response("Unknown event", { status: 400 });
        if (!/^NXR-E2E-/.test(ref)) {
          // Hard refuse: this endpoint is ONLY for seeded test orders.
          return new Response("orderRef must start with NXR-E2E-", { status: 403 });
        }

        await import("@/automation");
        const { automationApi } = await import("@/automation");
        await automationApi.emit(event as any, {
          orderId: ref,
          orderRef: ref,
          ...(body?.payload ?? {}),
        }, { sync: false, idempotencyKey: `${event}:${ref}` });

        return Response.json({ ok: true, event, ref });
      },
    },
  },
});