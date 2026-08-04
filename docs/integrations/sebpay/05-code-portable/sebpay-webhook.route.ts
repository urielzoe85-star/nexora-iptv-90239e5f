// -------------------------------------------------------------------------
// SebPay — route publique de webhook (portable, TanStack Start)
//
// À placer sous /api/public/* : ce préfixe est exempté de l'authentification
// du site. La sécurité est donc entièrement portée par ce handler.
// -------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";

// HMAC via Web Crypto — NE PAS utiliser node:crypto (createHmac) : sur une
// cible edge/Worker le bundler le résout vers __vite-browser-external et le
// build casse.
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparaison en temps constant : pas de sortie anticipée sur le 1er écart.
async function verifyHmac(secret: string, body: string, signatureHex: string): Promise<boolean> {
  const expected = (await hmacHex(secret, body)).toLowerCase();
  const provided = signatureHex.trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/sebpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Rate-limit best-effort (protection contre une tempête de rejeu).
        //    La cadence documentée de SebPay tourne autour de 6/min par
        //    événement ; 60/min par IP laisse une marge confortable.
        const { allow, clientKey, tooManyRequests } = await import("@/lib/rate-limit.server");
        const rl = allow(clientKey(request, "sebpay-webhook"), { limit: 60, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl);

        // 2. Corps BRUT — impératif : c'est lui qui est signé.
        const raw = await request.text();

        // 3. Signature.
        const signatureHeader =
          request.headers.get("x-sebpay-signature") ??
          request.headers.get("X-SebPay-Signature") ??
          "";
        const secret = (process.env.SEBPAY_SECRET_KEY ?? "").trim().replace(/^['"]|['"]$/g, "");
        if (!secret) {
          console.error("[sebpay-webhook] missing SEBPAY_SECRET_KEY");
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signatureHeader) {
          console.warn("[sebpay-webhook] missing X-SebPay-Signature header");
          return new Response("Missing signature", { status: 401 });
        }
        if (!(await verifyHmac(secret, raw, signatureHeader))) {
          // On ne journalise que la LONGUEUR, jamais la signature fournie.
          console.warn("[sebpay-webhook] invalid signature", {
            providedLength: signatureHeader.trim().length,
          });
          return new Response("Invalid signature", { status: 401 });
        }

        // 4. Parsing.
        let payload: Record<string, any>;
        try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

        const d = payload.data ?? payload;
        const ref: string | undefined =
          d.external_reference ?? d.reference ?? d.order_ref ?? d.ref ?? payload.metadata?.reference;
        if (!ref) return new Response("Missing external_reference", { status: 400 });

        // 5. Re-vérification serveur (defense in depth) — le statut du corps
        //    du webhook n'est JAMAIS utilisé pour décider de l'état réel.
        try {
          const { verifyPaymentInternal } = await import("./sebpay-verify.server");
          const result = await verifyPaymentInternal(ref);
          console.log("[sebpay-webhook] verified", { ref, status: result.status });
        } catch (e: unknown) {
          // ACK 200 malgré tout : une 5xx déclencherait une tempête de rejeu.
          console.error("[sebpay-webhook] processing error", e);
        }

        // 6. ACK rapide (< 5 s imposé par SebPay).
        return Response.json({ ok: true });
      },
    },
  },
});