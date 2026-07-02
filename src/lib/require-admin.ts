// Middleware `requireAdmin` — Sprint 2 / Bloc C.
// S'appuie sur `requireSupabaseAuth` (auth-middleware auto-généré) puis
// vérifie via `has_role(user, 'admin')` que l'appelant est administrateur.
// À utiliser sur toute server function réservée au back-office NCC.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    // `has_role` n'est pas EXECUTE pour le rôle `authenticated`
    // (RLS l'utilise via SECURITY DEFINER + owner grant), on l'appelle
    // donc avec le client admin (service_role) déjà autorisé.
    const { newRequestId } = await import("@/lib/security-events.server");
    const requestId = newRequestId("adm");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) {
      console.error("[requireAdmin] has_role error:", error.message);
      const { recordSecurityEvent } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.admin.check_error",
        severity: "warn",
        actor_user_id: context.userId,
        request_id: requestId,
        message: `has_role RPC failed: ${error.message}`,
      });
      throw new Error("Forbidden");
    }
    if (!data) {
      const { recordSecurityEvent } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.admin.forbidden",
        severity: "warn",
        actor_user_id: context.userId,
        request_id: requestId,
        message: "Non-admin user attempted to call an admin-only server function",
      });
      throw new Error("Forbidden");
    }
    return next({ context: { requestId } });
  });