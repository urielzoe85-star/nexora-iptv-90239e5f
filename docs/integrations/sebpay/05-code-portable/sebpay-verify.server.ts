// -------------------------------------------------------------------------
// SebPay — vérification idempotente (portable)
//
// SEUL point d'écriture du statut de paiement. Appelé par :
//   - le webhook (après vérification de signature),
//   - le polling du front,
//   - un cron de réconciliation.
// Sûr à appeler en concurrence et autant de fois que nécessaire.
// -------------------------------------------------------------------------

export async function verifyPaymentInternal(ref: string): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
  const { SEBPAY_COLLECTIONS_PATH: PATH, sebpayFetch, mapSebpayStatus } =
    await import("./sebpay.server");

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("order_ref, status, provider_reference, payment_provider, metadata, email, amount, currency")
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { status: "not_found" };

  // Court-circuit : état terminal ⇒ rien à faire (rejeu de webhook sûr).
  if (["paid", "failed", "cancelled"].includes(order.status)) return { status: order.status };

  const sebRef = order.provider_reference;
  if (!sebRef) return { status: order.status };

  const { status: httpStatus, raw, json } = await sebpayFetch(
    `${PATH}/${encodeURIComponent(sebRef)}`,
    { method: "GET" },
  );
  // Un échec HTTP ne modifie RIEN : on retentera.
  if (httpStatus < 200 || httpStatus >= 300 || !json) {
    console.error("[sebpay] verify failed", { ref, httpStatus, raw: raw.slice(0, 300) });
    return { status: order.status };
  }

  const j = json as Record<string, any>;
  const d = j.data ?? j;
  const providerStatusStr: string | null = d.status ?? j.status ?? j.payment_status ?? null;
  const mapped = mapSebpayStatus(providerStatusStr);
  if (mapped === "pending") return { status: "processing" };

  // Garde atomique : seule la première transition renvoie une ligne.
  const { data: updatedRows } = await supabaseAdmin
    .from("orders")
    .update({
      status: mapped,
      metadata: {
        ...((order.metadata as Record<string, unknown>) ?? {}),
        sebpay_verify_response: j,
        sebpay_verified_status: providerStatusStr,
        verified_at: new Date().toISOString(),
      },
    })
    .eq("order_ref", ref)
    .in("status", ["pending", "processing"])
    .select("order_ref, email, amount, currency");

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0;
  if (transitioned) {
    const row = updatedRows[0]!;
    // Effets métier (livraison, facture, notifications) — une seule fois.
    await emitBusinessEvent(
      mapped === "paid" ? "payment.confirmed" : mapped === "failed" ? "payment.failed" : null,
      {
        orderId: row.order_ref,
        orderRef: row.order_ref,
        email: row.email,
        amount: row.amount,
        currency: row.currency,
        provider: "sebpay",
        providerStatus: providerStatusStr,
      },
    );
  }

  return { status: mapped };
}

/**
 * Émission best-effort : le traitement d'un paiement ne doit jamais échouer
 * parce que la file d'automatisation est indisponible. La clé d'idempotence
 * empêche un doublon si l'appel est rejoué.
 */
export async function emitBusinessEvent(
  event: "payment.confirmed" | "payment.failed" | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!event) return;
  try {
    const { automationApi } = await import("@/automation");
    const ref = String(payload.orderRef ?? payload.orderId ?? "");
    await automationApi.emit(event, payload, {
      sync: false,
      idempotencyKey: ref ? `${event}:${ref}` : null,
    });
  } catch (e: unknown) {
    console.error("[automation] emit failed", { event, message: String(e) });
  }
}