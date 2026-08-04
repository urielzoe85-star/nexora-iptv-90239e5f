// -------------------------------------------------------------------------
// SebPay — création de la collecte (portable)
//
// Fichier « wrapper mince » : au niveau module, uniquement des imports, des
// types et la déclaration de la server function. Tout le runtime est chargé
// dynamiquement DANS le handler (le plugin server-fn retire les corps de
// handler des chunks client).
// -------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const initSebPayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      ref: z.string().min(4).max(40),
      successUrl: z.string().url(),
      failureUrl: z.string().url(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const {
      SEBPAY_BASE_URL,
      SEBPAY_COLLECTIONS_PATH: PATH,
      normalizePhone,
      operatorSlug,
      sebpayFetch,
    } = await import("./sebpay.server");

    // 1. Charger la commande et vérifier qu'elle est encore payable.
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_ref, email, full_name, amount, currency, method, status, metadata")
      .eq("order_ref", data.ref)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error(`Order is already ${order.status}; cannot start a new checkout.`);
    }
    if (order.method !== "momo") {
      throw new Error("Only Mobile Money (MTN / Orange / Moov / Wave) is supported by SebPay.");
    }

    // 2. Récupérer les coordonnées Mobile Money saisies au checkout.
    const momo = (order.metadata as Record<string, any> | null)?.momo as
      | { phone?: string; operator?: string; country?: string }
      | undefined;
    if (!momo?.phone || !momo?.operator || !momo?.country) {
      throw new Error("Mobile Money order is missing phone / operator / country.");
    }

    // 3. Le callback vit sur la même origine que le retour de paiement.
    const callbackUrl = `${new URL(data.successUrl).origin}/api/public/sebpay/webhook`;

    const payload: Record<string, unknown> = {
      amount: Number(order.amount),
      currency: order.currency,
      phone: normalizePhone(momo.phone),
      operator: operatorSlug(momo.operator),
      country: momo.country,
      external_reference: order.order_ref, // clé de corrélation
      callback_url: callbackUrl,
    };

    const endpoint = `${SEBPAY_BASE_URL}${PATH}`;
    const { status, raw, json } = await sebpayFetch(PATH, { method: "POST", body: payload });

    if (status < 200 || status >= 300 || !json) {
      const j = json as Record<string, any> | null;
      const detail = (j && (j.message || j.error || j.detail)) || raw.slice(0, 500) || "(empty response body)";
      const fieldErrors = j?.errors ? ` — fields: ${JSON.stringify(j.errors).slice(0, 400)}` : "";
      console.error("[sebpay] create collection failed", { status, endpoint, detail, fieldErrors });
      // Message générique côté client : le détail fournisseur reste serveur.
      throw new Error("Le paiement n'a pas pu être initialisé. Veuillez réessayer ou contacter le support.");
    }

    // 4. Lire la réponse en tolérant l'enveloppe `data` et les alias de champs.
    const j = json as Record<string, any>;
    const d = j.data ?? j;
    const sebpayId: string | undefined = d.transaction_id ?? d.id ?? d.reference;
    const providerLink: string | undefined =
      d.provider_link ?? d.payment_url ?? d.checkout_url ?? d.url ?? undefined;
    const sebMessage: string | undefined = d.message ?? j.message;
    const sebStatus: string | undefined = d.status ?? j.status;
    if (!sebpayId) {
      throw new Error(`SebPay did not return a transaction_id. Raw: ${raw.slice(0, 500)}`);
    }

    // 5. Passer en `processing` + conserver la trace complète.
    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        payment_provider: "sebpay",
        provider_reference: sebpayId,
        metadata: {
          ...((order.metadata as Record<string, unknown>) ?? {}),
          sebpay_endpoint: endpoint,
          sebpay_request: payload,
          sebpay_response: j,
          sebpay_provider_link: providerLink ?? null,
          sebpay_initial_status: sebStatus ?? null,
        },
      })
      .eq("order_ref", order.order_ref);

    return {
      transactionId: sebpayId,
      providerLink: providerLink ?? null, // null ⇒ push USSD, afficher un écran d'attente
      status: sebStatus ?? "pending",
      message: sebMessage ?? null,
    };
  });

// Vérification appelable depuis le front (polling de l'écran d'attente).
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyPaymentInternal } = await import("./sebpay-verify.server");
    return verifyPaymentInternal(data.ref);
  });