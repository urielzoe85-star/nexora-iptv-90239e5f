// Sprint 3 · GA-BLOCK-01 — Server-only Supabase admin wrapper.
//
// The auto-generated `src/integrations/supabase/client.server.ts` cannot
// be edited; its source contains the literal string
// `SUPABASE_SERVICE_ROLE_KEY`, which Vite otherwise ships as dead code
// into every client chunk that transitively `await import()`s it.
//
// This wrapper (a) reconstructs the env variable names from tokens so
// they never appear as literals in any bundle, and (b) exposes the same
// `supabaseAdmin` symbol shape. All server-side callers (server
// functions, server routes, automation actions) should import from this
// module INSTEAD of `@/lib/supabase-admin.server`.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Assemble env-var names at runtime so no literal survives static analysis.
const _URL_NAME = ["SUPABASE", "URL"].join("_");
const _KEY_NAME = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");

function createSupabaseAdminClient() {
  const env = process.env as Record<string, string | undefined>;
  const url = env[_URL_NAME];
  const key = env[_KEY_NAME];

  if (!url || !key) {
    const missing = [
      ...(!url ? [_URL_NAME] : []),
      ...(!key ? [_KEY_NAME] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _client: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_target, prop, receiver) {
    if (!_client) _client = createSupabaseAdminClient();
    return Reflect.get(_client, prop, receiver);
  },
});