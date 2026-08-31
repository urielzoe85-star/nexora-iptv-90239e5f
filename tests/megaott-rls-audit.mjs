/* Static RLS guard for the MegaOTT credential table. No database mutation. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(
  "supabase/migrations/20260627005012_7c0d7cbe-5325-4c3c-b405-20d5dc548f82.sql",
  "utf8",
);
const mappingSql = await readFile(
  "supabase/migrations/20260830210000_megaott_plan_mappings.sql",
  "utf8",
);
assert.match(sql, /ALTER TABLE public\.iptv_accounts ENABLE ROW LEVEL SECURITY/i);
assert.match(sql, /CREATE POLICY\s+"iptv_accounts admin all"/i);
assert.match(sql, /ON public\.iptv_accounts FOR ALL TO authenticated/i);
assert.match(sql, /has_role\(auth\.uid\(\),\s*'admin'\)/i);
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]*?ON public\.iptv_accounts[\s\S]*?TO anon/i);
assert.doesNotMatch(
  sql,
  /CREATE POLICY[\s\S]*?ON public\.iptv_accounts[\s\S]*?USING \([^)]*customer_id/i,
);
assert.match(
  mappingSql,
  /ALTER TABLE public\.iptv_provider_plan_mappings ENABLE ROW LEVEL SECURITY/i,
);
assert.match(mappingSql, /ON public\.iptv_provider_plan_mappings[\s\S]*?FOR ALL TO authenticated/i);
assert.match(mappingSql, /has_role\(auth\.uid\(\),\s*'admin'\)/i);
assert.doesNotMatch(mappingSql, /TO anon/i);
console.log(
  JSON.stringify({
    rls_enabled: true,
    mapping_rls_enabled: true,
    anon_read: false,
    cross_customer_read: false,
    server_role_path: "supabaseAdmin",
  }),
);
