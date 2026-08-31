/* Static mapping checks; no Supabase connection and no provider calls. */
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260830210000_megaott_plan_mappings.sql", import.meta.url),
  "utf8",
);
const action = fs.readFileSync(
  new URL("../src/automation/actions/iptv.actions.ts", import.meta.url),
  "utf8",
);
const publicOrders = fs.readFileSync(
  new URL("../src/lib/orders.functions.ts", import.meta.url),
  "utf8",
);

for (const [plan, pkg, months] of [
  ["1m", "4", 1],
  ["3m", "6", 3],
  ["6m", "3", 6],
  ["12m", "5", 12],
]) {
  assert.match(migration, new RegExp(`WHEN '${plan}' THEN '${pkg}'`));
  assert.match(migration, new RegExp(`WHEN '${plan}' THEN ${months}`));
}
assert.match(migration, /FROM public\.plans p/);
assert.match(migration, /p\.active = true/);
assert.match(migration, /UNIQUE \(provider, plan_id\)/);
assert.match(action, /from\("iptv_provider_plan_mappings"\)/);
assert.match(action, /\.eq\("enabled", true\)/);
assert.match(action, /MEGAOTT mapping package_id absent/);
assert.match(action, /state.*manual_review/);
assert.doesNotMatch(action, /mappedPackageId/);
const mappingStart = action.indexOf("if (input.orderId && orderRow?.plan_id)");
const mappingEnd = action.indexOf("} else if (!input.orderId)", mappingStart);
const orderMappingSection = action.slice(mappingStart, mappingEnd);
assert.doesNotMatch(orderMappingSection, /defaultPackageId/);
assert.doesNotMatch(publicOrders, /provider_package_id/);

console.log(
  JSON.stringify({
    "1m_to_4": "pass",
    "3m_to_6": "pass",
    "6m_to_3": "pass",
    "12m_to_5": "pass",
    missing_mapping_blocks_provider: "pass",
    disabled_mapping_blocks_provider: "pass",
    invalid_package_manual_review: "pass",
    unique_plan_mapping: "pass",
    frontend_projection: "pass",
  }),
);
