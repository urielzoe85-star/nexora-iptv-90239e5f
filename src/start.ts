import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
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

// Security headers applied to every server response (SSR, server routes,
// server functions). Values are conservative and framework-safe:
//   - HSTS is only sent over HTTPS
//   - CSP is intentionally omitted here (needs per-route script/style audit);
//     tracked for a later hardening pass
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const result: any = await next();
  const response: Response | undefined = result?.response;
  if (response && response.headers) {
    const isHttps = new URL(request.url).protocol === "https:";
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (k === "Strict-Transport-Security" && !isHttps) continue;
      if (!response.headers.has(k)) response.headers.set(k, v);
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
