import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  // Bypass the global error wrapper for Lovable email infra + one-click unsubscribe.
  // These routes are called by Lovable services or email clients (RFC 8058) and must
  // not be wrapped in the SSR error HTML response.
  try {
    const req = (globalThis as any).request as Request | undefined;
    // No-op: middleware does not receive request here; the /lovable/* routes
    // authenticate themselves and never reach SSR. Kept for future safety.
  } catch { /* noop */ }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
