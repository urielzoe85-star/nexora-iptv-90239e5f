// Payment provider abstraction. The system is provider-agnostic: services
// reference the registry, never a concrete provider. Adding a new gateway
// = implement PaymentProvider + register it here, nothing else.

export type PaymentProviderId =
  | "sebpay"
  | "stripe"
  | "paypal"
  | "orange_money"
  | "mtn_momo"
  | "crypto"
  | "binance_pay_manual";

export interface PaymentChargeInput {
  amount: number;
  currency: string;
  customerEmail: string;
  orderRef: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentChargeResult {
  providerReference: string;
  redirectUrl?: string;
  status: "pending" | "succeeded" | "failed";
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly label: string;
  readonly enabled: boolean;
  createCharge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
}

class NotImplementedProvider implements PaymentProvider {
  constructor(public readonly id: PaymentProviderId, public readonly label: string) {}
  readonly enabled = false;
  async createCharge(): Promise<PaymentChargeResult> {
    throw new Error(`Payment provider "${this.id}" is not implemented yet.`);
  }
}

// SebPay is the only provider wired in real life today (public webhook flow).
// We keep it as a thin marker here; actual webhook handling stays in the
// existing public route under /api/public/sebpay/webhook.
class SebPayMarkerProvider implements PaymentProvider {
  readonly id = "sebpay" as const;
  readonly label = "SebPay (Mobile Money)";
  readonly enabled = true;
  async createCharge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    // Real charge creation lives in the public checkout flow.
    return { providerReference: input.orderRef, status: "pending" };
  }
}

// Binance Pay semi-automatique : le client paie via QR statique, envoie
// une preuve, un admin valide dans la NCC → livraison IPTV déclenchée.
// Ce marqueur permet le remplacement futur par la Merchant API officielle
// sans changer le reste du système.
class BinancePayManualMarkerProvider implements PaymentProvider {
  readonly id = "binance_pay_manual" as const;
  readonly label = "Binance Pay (QR + validation manuelle)";
  readonly enabled = true;
  async createCharge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    return { providerReference: input.orderRef, status: "pending" };
  }
}

export const PAYMENT_PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  sebpay:       new SebPayMarkerProvider(),
  stripe:       new NotImplementedProvider("stripe", "Stripe"),
  paypal:       new NotImplementedProvider("paypal", "PayPal"),
  orange_money: new NotImplementedProvider("orange_money", "Orange Money"),
  mtn_momo:     new NotImplementedProvider("mtn_momo", "MTN Mobile Money"),
  crypto:       new NotImplementedProvider("crypto", "Crypto"),
  binance_pay_manual: new BinancePayManualMarkerProvider(),
};

export const PAYMENT_PROVIDER_LIST: PaymentProvider[] = Object.values(PAYMENT_PROVIDERS);

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const p = PAYMENT_PROVIDERS[id];
  if (!p) throw new Error(`Unknown payment provider: ${id}`);
  return p;
}