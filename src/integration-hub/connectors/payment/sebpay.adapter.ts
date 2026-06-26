// SebPay adapter — THIN WRAPPER ONLY.
// The real integration (auth keys, /collections endpoints, webhook
// signature verification) lives in src/lib/payments.functions.ts and
// src/routes/api/public/sebpay/webhook.ts and MUST NOT change. This
// adapter only re-exposes the existing serverFn-internal helpers under
// the Integration Hub contract so other modules can resolve a payment
// connector by id without coupling to the SebPay-specific functions.

import { integrationError } from "../../core/errors";
import { secretsManager } from "../../core/secrets";
import { err, ok } from "../../core/result";
import type { PaymentConnector, PaymentChargeInput, PaymentChargeResult, PaymentVerifyResult } from "./types";

export const sebpayConnector: PaymentConnector = {
  id: "payment.sebpay",
  type: "payment",
  label: "SebPay (Mobile Money)",
  status: "enabled",
  capabilities: ["charge", "verify", "webhook"],

  isReady() {
    return secretsManager.has("SEBPAY_PUBLIC_KEY") && secretsManager.has("SEBPAY_SECRET_KEY");
  },

  // The existing checkout UI continues to call initSebPayCheckout directly
  // — we do NOT route it through the hub to avoid any change in behaviour.
  // This method exists so NEW modules (e.g. NCC admin actions) can request
  // a charge through the abstraction.
  async createCharge(input: PaymentChargeInput) {
    if (!input.successUrl || !input.failureUrl) {
      return err(integrationError("validation", "successUrl and failureUrl are required for SebPay", { connectorId: this.id }));
    }
    try {
      const { initSebPayCheckout } = await import("@/lib/payments.functions");
      // initSebPayCheckout is a serverFn; calling it from another serverFn
      // is supported. From the client it would be wrapped by useServerFn.
      const r = await (initSebPayCheckout as any)({ data: { ref: input.orderRef, successUrl: input.successUrl, failureUrl: input.failureUrl } });
      const result: PaymentChargeResult = {
        providerReference: r.transactionId,
        status: r.status === "approved" ? "paid" : r.status === "rejected" ? "failed" : "processing",
        redirectUrl: r.providerLink ?? null,
        message: r.message ?? null,
      };
      return ok(result);
    } catch (e: any) {
      return err(integrationError("provider", String(e?.message ?? e), { connectorId: this.id }));
    }
  },

  async verifyCharge(orderRef: string) {
    try {
      const { verifyPaymentInternal } = await import("@/lib/payments.functions");
      const r = await verifyPaymentInternal(orderRef);
      const status = (r.status as PaymentVerifyResult["status"]) ?? "pending";
      return ok({ status });
    } catch (e: any) {
      return err(integrationError("provider", String(e?.message ?? e), { connectorId: this.id }));
    }
  },
};