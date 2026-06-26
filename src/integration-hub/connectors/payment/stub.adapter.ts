// Stub adapters for payment providers prepared but not implemented yet.
// Adding a real Stripe/PayPal/etc. = replace the corresponding stub.

import { integrationError } from "../../core/errors";
import { err } from "../../core/result";
import type { PaymentConnector } from "./types";

function stub(id: string, label: string): PaymentConnector {
  return {
    id, type: "payment", label, status: "stub",
    isReady() { return false; },
    async createCharge() {
      return err(integrationError("not_implemented", `${label} is not implemented yet`, { connectorId: id }));
    },
    async verifyCharge() {
      return err(integrationError("not_implemented", `${label} is not implemented yet`, { connectorId: id }));
    },
  };
}

export const stripeConnector       = stub("payment.stripe",       "Stripe");
export const paypalConnector       = stub("payment.paypal",       "PayPal");
export const orangeMoneyConnector  = stub("payment.orange_money", "Orange Money");
export const mtnMomoConnector      = stub("payment.mtn_momo",     "MTN Mobile Money");
export const cryptoConnector       = stub("payment.crypto",       "Crypto");