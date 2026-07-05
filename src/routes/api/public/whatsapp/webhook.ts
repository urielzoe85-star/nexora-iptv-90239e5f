import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      // Meta verification handshake
      GET: async ({ request }) => {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        if (!verifyToken) return new Response("Not configured", { status: 503 });

        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";

        if (mode === "subscribe" && token && safeEqual(token, verifyToken)) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Event delivery
      POST: async ({ request }) => {
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (!appSecret) return new Response("Not configured", { status: 503 });

        const rawBody = await request.text();
        const header = request.headers.get("x-hub-signature-256") ?? "";
        const provided = header.startsWith("sha256=") ? header.slice(7) : header;
        const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");

        if (!provided || !safeEqual(provided.toLowerCase(), expected.toLowerCase())) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const update = JSON.parse(rawBody);
          // Log basique — traitement métier à brancher plus tard
          console.log("[whatsapp.webhook]", JSON.stringify(update).slice(0, 2000));
        } catch {
          // ignore parse errors — répondre 200 quoi qu'il arrive
        }

        return Response.json({ ok: true });
      },
    },
  },
});