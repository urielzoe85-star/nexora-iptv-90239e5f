// Actions liées aux commandes — encapsulent les accès directs à la table
// `orders` pour qu'aucun workflow ne dépende d'un fichier métier précis.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function fetchOrder(orderId: string) {
  const sb = await admin();
  // The webhook + verifyPayment emit `orderId = order_ref` (the public ref
  // like "NX-XXXX"), not the row UUID. Look up by order_ref first, fall back
  // to id so callers passing a UUID still work.
  const byRef = await sb.from("orders").select("*").eq("order_ref", orderId).maybeSingle();
  if (byRef.error) throw new Error(byRef.error.message);
  if (byRef.data) return byRef.data;
  const byId = await sb.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  if (!byId.data) throw new Error(`Commande ${orderId} introuvable`);
  return byId.data;
}

export async function markOrderStatus(orderId: string, status: "processing" | "completed" | "cancelled" | "refunded") {
  const sb = await admin();
  // Accept either order_ref (public) or id (uuid).
  const byRef = await sb.from("orders").update({ status }).eq("order_ref", orderId).select("id");
  if (byRef.error) throw new Error(byRef.error.message);
  if (byRef.data && byRef.data.length > 0) return { orderId, status };
  const { error } = await sb.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  return { orderId, status };
}

export async function generateInvoiceStub(orderId: string) {
  // Stub : la génération de facture sera branchée sur le module facturation
  // dans une version ultérieure. On retourne juste un identifiant lisible.
  return { invoiceRef: `INV-${orderId.slice(0, 8).toUpperCase()}`, generated: true };
}