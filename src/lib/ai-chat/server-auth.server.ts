// Server-only Supabase JWT verifier used by AI chat streaming routes,
// which are TanStack file routes (no middleware chain).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  token: string;
}

export async function requireAdminFromRequest(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) throw new Response("Server misconfigured", { status: 500 });

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Response("Unauthorized", { status: 401 });
  const userId = data.claims.sub;

  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { data: isAdmin, error: rpcErr } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (rpcErr || !isAdmin) throw new Response("Forbidden", { status: 403 });

  const email = (data.claims as Record<string, unknown>).email as string | undefined ?? null;
  return { userId, email, token };
}