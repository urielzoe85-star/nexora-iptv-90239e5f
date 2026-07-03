// Middleware `requireNccUnlock` — Sprint 2 hardening follow-up.
// Composes `requireAdmin` and then enforces that the caller has completed
// the NCC second-factor password check within the last 8 hours. The proof
// lives in an HttpOnly signed cookie (`ncc_gate`) issued by
// `verifyNccAccess` — the previous `sessionStorage` flag was purely
// cosmetic and could be forged from the browser console.
import { createMiddleware } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export const requireNccUnlock = createMiddleware({ type: "function" })
  .middleware([requireAdmin])
  .server(async ({ next, context }) => {
    const { readNccGateCookie, verifyNccToken } = await import("@/lib/ncc-gate.server");
    const token = await readNccGateCookie();
    if (!verifyNccToken(token, context.userId)) {
      const { recordSecurityEvent, newRequestId } = await import("@/lib/security-events.server");
      await recordSecurityEvent({
        event_type: "auth.ncc.gate_missing",
        severity: "warn",
        actor_user_id: context.userId,
        request_id: newRequestId("ncc"),
        message: "Admin called an NCC server function without a valid NCC unlock cookie",
      });
      throw new Error("NCC unlock required");
    }
    return next();
  });
