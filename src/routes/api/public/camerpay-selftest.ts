import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY self-test — signs a synthetic CamerPay webhook payload with
// the server-side CAMERPAY_WEBHOOK_SECRET and POSTs it to the real
// webhook, then returns the response. Delete after validation.
export const Route = createFileRoute("/api/public/camerpay-selftest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ref = url.searchParams.get("ref") ?? "NX-CAMTEST1";
        const status = url.searchParams.get("status") ?? "completed";
        const amount = url.searchParams.get("amount") ?? "1000";
        const provider = (url.searchParams.get("provider") ?? "camerpay").toLowerCase();
        const uuid = `selftest-${provider}-${ref}`;

        const secretEnv =
          provider === "stripe" ? "CAMERPAY_STRIPE_WEBHOOK_SECRET"
          : provider === "paypal" ? "CAMERPAY_PAYPAL_WEBHOOK_SECRET"
          : "CAMERPAY_WEBHOOK_SECRET";
        const targetPath =
          provider === "stripe" ? "/api/public/stripe/webhook"
          : provider === "paypal" ? "/api/public/paypal/webhook"
          : "/api/public/camerpay/webhook";

        const secret = (process.env[secretEnv] ?? "").trim().replace(/^['"]|['"]$/g, "");
        if (!secret) return Response.json({ ok: false, error: `no secret in env (${secretEnv})` }, { status: 500 });

        const { createHmac } = await import("node:crypto");
        const data = `${uuid}|${ref}|${status}|${amount}`;
        const signature = createHmac("sha256", secret).update(data).digest("hex");

        const body = new URLSearchParams({ uuid, invoice_id: ref, status, amount, signature }).toString();
        const target = new URL(targetPath, url.origin).toString();
        const res = await fetch(target, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CamerPay-Event-Id": `evt-selftest-${provider}-${ref}-${Date.now()}`,
          },
          body,
          redirect: "follow",
        });
        const txt = await res.text();
        return Response.json({ ok: res.ok, status: res.status, provider, response: txt, signed: data, target });
      },
    },
  },
});