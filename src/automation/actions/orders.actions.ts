// Actions liées aux commandes — encapsulent les accès directs à la table
// `orders` pour qu'aucun workflow ne dépende d'un fichier métier précis.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function fetchOrder(orderId: string) {
  const sb = await admin();
  const { data, error } = await sb.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Commande ${orderId} introuvable`);
  return data;
}

export async function markOrderStatus(orderId: string, status: "processing" | "completed" | "cancelled" | "refunded") {
  const sb = await admin();
  const { error } = await sb.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  return { orderId, status };
}

export async function generateInvoiceStub(orderId: string) {
  // Stub : la génération de facture sera branchée sur le module facturation
  // dans une version ultérieure. On retourne juste un identifiant lisible.
  return { invoiceRef: `INV-${orderId.slice(0, 8).toUpperCase()}`, generated: true };
}