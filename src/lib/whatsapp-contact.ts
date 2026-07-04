// Lien click-to-chat WhatsApp Business (compte standard, pas d'API).
// Le numéro doit être au format international sans "+" ni espace.
export const WHATSAPP_BUSINESS_NUMBER = "237698608808";

export function buildWhatsAppLink(opts?: { orderRef?: string | null; message?: string | null }): string {
  const text =
    opts?.message ??
    (opts?.orderRef
      ? `Bonjour Nexora, ma commande ${opts.orderRef} — j'ai besoin d'aide 🙏`
      : "Bonjour Nexora, j'ai besoin d'aide 🙏");
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(text)}`;
}