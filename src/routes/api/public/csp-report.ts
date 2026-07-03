// Sprint 3 · Bloc D — CSP violation sink.
//
// Browsers POST here whenever a resource is blocked by the CSP header set in
// `src/start.ts`. We rate-limit hard (a broken policy could fire thousands of
// reports per page load) and persist a redacted summary into
// `public.security_events` with severity `warn` so the on-call Telegram bot
// pings us. No PII is stored — only the blocked URI, the violated directive
// and the effective directive.
import { createFileRoute } from "@tanstack/react-router";

import { allow } from "@/lib/rate-limit.server";

type CspReport = {
  "csp-report"?: Record<string, unknown>;
};

function pick(obj: Record<string, unknown> | undefined, key: string): string | null {
  const v = obj?.[key];
  return typeof v === "string" ? v.slice(0, 512) : null;
}

export const Route = createFileRoute("/api/public/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const rl = allow(`csp-report:${ip}`, { limit: 30, windowMs: 60_000 });
        if (!rl.ok) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          });
        }

        let body: CspReport | Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const r = (body?.["csp-report"] ?? body) as Record<string, unknown>;
        const blocked = pick(r, "blocked-uri");
        const directive = pick(r, "violated-directive") || pick(r, "effective-directive");
        const documentUri = pick(r, "document-uri");

        // Ignore known browser-extension noise ("chrome-extension:" / "moz-extension:")
        // and blank blocked URIs (source-map preflights).
        const isNoise =
          !blocked ||
          blocked === "about" ||
          blocked.startsWith("chrome-extension:") ||
          blocked.startsWith("moz-extension:") ||
          blocked.startsWith("safari-extension:");
        if (isNoise) return new Response(null, { status: 204 });

        try {
          const { recordSecurityEvent } = await import("@/lib/security-events.server");
          await recordSecurityEvent({
            event_type: "csp.violation",
            severity: "warn",
            route: documentUri,
            ip,
            user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
            message: `CSP violation: ${directive} blocked ${blocked}`,
            payload: { blocked, directive, document_uri: documentUri },
          });
        } catch (e) {
          console.error("[csp-report] recordSecurityEvent failed", e);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
