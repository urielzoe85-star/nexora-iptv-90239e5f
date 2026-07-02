// Middleware `requireAdmin` — Sprint 2 / Bloc C.
// S'appuie sur `requireSupabaseAuth` (auth-middleware auto-généré) puis
// vérifie via `has_role(user, 'admin')` que l'appelant est administrateur.
// À utiliser sur toute server function réservée au back-office NCC.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) {
      console.error("[requireAdmin] has_role error:", error.message);
      throw new Error("Forbidden");
    }
    if (!data) {
      throw new Error("Forbidden");
    }
    return next();
  });