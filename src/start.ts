import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { PORTAL_HOST, PORTAL_BASE_URL, MARKETING_BASE_URL, isAccountAllowedPath } from "./lib/portal-url";

// Sous-domaine dédié à l'espace client : sur account.nexora-iptv.com, on
// redirige la racine vers /espace-client et on renvoie les routes marketing
// vers www.nexora-iptv.com. Doit tourner AVANT les autres middlewares pour
// éviter tout traitement inutile.
const accountSubdomainMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  const url = new URL(request.url);
  if (url.hostname !== PORTAL_HOST) return next();
  const p = url.pathname;
  if (p === "/" || p === "") {
    return Response.redirect(`${PORTAL_BASE_URL}/espace-client`, 302);
  }
  if (!isAccountAllowedPath(p)) {
    return Response.redirect(`${MARKETING_BASE_URL}${p}${url.search}`, 302);
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
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
//   - CSP is shipped in Report-Only by default (Sprint 3 · Bloc D). Set
//     `CSP_ENFORCE=1` to switch to enforcing mode once the report endpoint
//     shows zero critical violations over 7 days.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
};

// Content Security Policy — Sprint 3 · Bloc D.
// Deliberately allows the exact set of third-party origins the app uses today:
//   - Google Fonts CSS/font files
//   - Google Cloud Storage bucket that hosts the OG image
//   - Supabase project (Data API + Realtime) — read from VITE_SUPABASE_URL
// `'unsafe-inline'` on style-src is kept because TanStack Start / shadcn ship
// inline style attributes; a nonce-based tightening is tracked separately.
// `'unsafe-inline'` on script-src covers the JSON-LD block and TanStack's
// hydration payload; the plan is to migrate to nonces in a follow-up.
function buildCsp(): string {
  const supabase = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const supaHttps = supabase || "https://*.supabase.co";
  const supaWss = supabase ? supabase.replace(/^https:/, "wss:") : "wss://*.supabase.co";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https://storage.googleapis.com https://www.googletagmanager.com ${supaHttps}`,
    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com ${supaHttps} ${supaWss}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "report-uri /api/public/csp-report",
  ].join("; ");
}

const CSP_ENFORCE = process.env.CSP_ENFORCE === "1";
const CSP_HEADER_NAME = CSP_ENFORCE
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  const result: any = await next();
  const response: Response | undefined = result?.response;
  if (response && response.headers) {
    const isHttps = new URL(request.url).protocol === "https:";
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (k === "Strict-Transport-Security" && !isHttps) continue;
      if (!response.headers.has(k)) response.headers.set(k, v);
    }
    // Only attach CSP to HTML documents — JSON / assets don't need it and
    // some middlebox proxies choke on the header on non-HTML responses.
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("text/html") && !response.headers.has(CSP_HEADER_NAME)) {
      response.headers.set(CSP_HEADER_NAME, buildCsp());
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [accountSubdomainMiddleware, errorMiddleware, securityHeadersMiddleware],
}));
