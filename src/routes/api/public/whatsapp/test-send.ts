import { createFileRoute } from "@tanstack/react-router";
import { errorMessage } from "@/lib/error-message";

// Route de test one-shot — envoie un message WhatsApp brut via Meta Cloud API.
// Protégée par le même secret que le webhook (WHATSAPP_VERIFY_TOKEN) passé en
// query string. À supprimer après validation.
export const Route = createFileRoute("/api/public/whatsapp/test-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const to = url.searchParams.get("to") ?? "";
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (!expected || token !== expected) {
          return new Response("forbidden", { status: 403 });
        }
        try {
          const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
          const text =
            "✅ Test Nexora — WhatsApp Cloud API opérationnelle. Ce message confirme l'intégration Meta Business.";
          const res: any = await sendWhatsAppText(to, text);
          return Response.json(
            {
              ok: res.ok,
              status: res.status,
              messageId: res.messageId ?? null,
              error: res.error ?? null,
              data: res.data ?? null,
            },
            { status: res.ok ? 200 : 502 },
          );
        } catch (e: unknown) {
          return Response.json({ ok: false, error: errorMessage(e) ?? "unknown" }, { status: 500 });
        }
      },
    },
  },
});