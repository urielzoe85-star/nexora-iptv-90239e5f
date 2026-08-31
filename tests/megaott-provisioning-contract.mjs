/* Static contract checks for the server-side provisioning workflow.
 * These checks do not contact Supabase or MegaOTT and never require secrets.
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const action = read("../src/automation/actions/iptv.actions.ts");
const workflow = read("../src/automation/workflows/payment-confirmed.workflow.ts");
const drainer = read("../src/lib/automation-drainer.server.ts");
const payment = read("../src/lib/payments.functions.ts");
const server = read("../src/lib/iptv-megaott.functions.ts");
const orders = read("../src/lib/orders.functions.ts");
const card = read("../src/components/ncc/orders/IptvDeliveryCard.tsx");
const adapter = read("../src/integration-hub/connectors/iptv/megaott.adapter.ts");

assert.match(workflow, /!\["paid", "completed"\]\.includes\(String\(order\.status\)\)/);
assert.match(payment, /iptv_provisioning[\s\S]{0,240}state:\s*"pending"/);
assert.match(action, /metadata->>order_ref/);
assert.match(action, /\.eq\("order_id", orderRow\.id\)/);
assert.match(
  action,
  /type ProvisioningState\s*=\s*[\s\S]*?"pending"[\s\S]*?"processing"[\s\S]*?"provisioned"[\s\S]*?"failed"[\s\S]*?"retrying"[\s\S]*?"manual_review"/,
);
assert.match(drainer, /state: "retrying" \| "failed"/);
assert.match(drainer, /failed \? "failed" : "retrying"/);
assert.match(action, /r\.error\.kind === "rate_limited"/);
assert.match(action, /retryable \? "retrying" : "manual_review"/);
assert.match(server, /export const retryMegaottProvisioning/);
assert.match(server, /export const syncMegaottOrder/);
assert.match(server, /getConnector\(\)\.getUser/);
const syncSection = server.slice(
  server.indexOf("export const syncMegaottOrder"),
  server.indexOf("// ─── R", server.indexOf("export const syncMegaottOrder")),
);
assert.doesNotMatch(syncSection, /createUser/);
assert.match(card, /Retry provisioning/);
assert.match(card, /Synchroniser avec MegaOTT/);
assert.match(card, /provider_creation_possible/);
assert.match(card, /confirm_ambiguous/);
for (const state of ["pending", "processing", "provisioned", "failed", "retrying", "manual_review"])
  assert.match(action, new RegExp(`"${state}"`));
assert.match(orders, /const publicDelivery =/);
assert.match(orders, /username: delivery\.username/);
assert.match(orders, /password: delivery\.password/);
assert.match(orders, /m3u_url: delivery\.m3u_url/);
assert.doesNotMatch(orders, /return \{ ok: true as const, delivery, order_ref/);
assert.doesNotMatch(adapter, /import\.meta\.env/);
assert.doesNotMatch(adapter, /NEXT_PUBLIC_|VITE_/);
assert.match(adapter, /MEGAOTT_REAL_PROVISIONING_ENABLED/);
assert.match(server, /megaottRealProvisioningEnabled\(\)/);

console.log(
  JSON.stringify({
    payment_gate: "pass",
    idempotency_guards: "pass",
    state_machine: "pass",
    retry_policy: "pass",
    ambiguous_create_manual_review: "pass",
    admin_retry_sync: "pass",
    delivery_projection: "pass",
    server_only_adapter: "pass",
  }),
);
