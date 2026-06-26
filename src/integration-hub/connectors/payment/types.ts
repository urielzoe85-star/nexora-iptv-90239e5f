import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface PaymentChargeInput {
  orderRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  // Channel-specific extras (e.g. Mobile Money phone/operator/country)
  metadata?: Record<string, unknown>;
  successUrl?: string;
  failureUrl?: string;
}

export interface PaymentChargeResult {
  providerReference: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  redirectUrl?: string | null;
  message?: string | null;
}

export interface PaymentVerifyResult {
  status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "not_found";
}

export interface PaymentConnector extends Connector {
  readonly type: "payment";
  createCharge(input: PaymentChargeInput): Promise<Result<PaymentChargeResult, IntegrationError>>;
  verifyCharge(orderRef: string): Promise<Result<PaymentVerifyResult, IntegrationError>>;
}