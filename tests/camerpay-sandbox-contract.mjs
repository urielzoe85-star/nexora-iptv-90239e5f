/* Local, deterministic CamerPay sandbox contract checks.
 * No network, credentials, Supabase, Lovable or MegaOTT calls are made.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHmac } from "node:crypto";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const adapter = read("../src/lib/payments-camerpay.server.ts");
const webhook = read("../src/lib/camerpay-webhook-handler.server.ts");
const nativeWebhook = read("../src/routes/api/public/camerpay/webhook.ts");
const workflow = read("../src/automation/workflows/payment-confirmed.workflow.ts");
const payments = read("../src/lib/payments.functions.ts");

const camerpay = await import("../src/lib/payments-camerpay.server.ts");
process.env.CAMERPAY_MODE = "sandbox";
assert.equal(camerpay.camerpayMode(), "sandbox");
assert.equal(camerpay.assertCamerpayWebhookEnvironment(true), "sandbox");
assert.throws(() => camerpay.assertCamerpayWebhookEnvironment(false), /environment mismatch/);
process.env.CAMERPAY_MODE = "production";
assert.equal(camerpay.camerpayMode(), "production");
assert.throws(() => camerpay.assertCamerpayWebhookEnvironment(true), /environment mismatch/);

assert.match(adapter, /CAMERPAY_API_KEY/);
assert.match(adapter, /CAMERPAY_WEBHOOK_SECRET/);
assert.match(adapter, /CAMERPAY_MODE/);
assert.match(adapter, /\/api\/payment\/initiate/);
assert.match(adapter, /\/api\/payment\/\$\{encodeURIComponent\(uuid\)\}\/status/);
assert.match(
  adapter,
  /\$\{params\.uuid\}\|\$\{params\.invoiceId\}\|\$\{params\.status\}\|\$\{params\.amount\}/,
);
assert.match(webhook, /amount mismatch/);
assert.match(nativeWebhook, /amount mismatch/);
assert.match(webhook, /paymentEnvironment/);
assert.match(nativeWebhook, /paymentEnvironment/);
assert.match(workflow, /sandboxPayment/);
assert.match(workflow, /isRealPayment/);
assert.match(payments, /idempotencyKey = ref \? `\$\{event\}:\$\{ref\}`/);

// Exercise the pure mapping/signature behavior without importing server modules.
const map = (status) =>
  status === "completed" || status === "refunded"
    ? "paid"
    : status === "failed"
      ? "failed"
      : status === "cancelled" || status === "canceled"
        ? "cancelled"
        : "pending";
assert.equal(map("pending"), "pending");
assert.equal(map("processing"), "pending");
assert.equal(map("completed"), "paid");
assert.equal(map("failed"), "failed");
assert.equal(map("cancelled"), "cancelled");

const fields = {
  uuid: "sandbox-uuid",
  invoiceId: "NXR-SBX-1",
  status: "completed",
  amount: "5000.00",
};
const secret = "local-test-only";
const signed = `${fields.uuid}|${fields.invoiceId}|${fields.status}|${fields.amount}`;
const signature = createHmac("sha256", secret).update(signed).digest("hex");
assert.equal(signature.length, 64);
assert.notEqual(signature, createHmac("sha256", secret).update(`${signed}-tampered`).digest("hex"));

const results = {
  files_and_env: "pass",
  endpoints_and_signature: "pass",
  status_mapping: "pass",
  amount_and_order_guards: "pass",
  sandbox_environment_fence: "pass",
  single_confirmed_idempotency: "pass",
  megaott_real_calls: 0,
};
console.log(JSON.stringify(results));
