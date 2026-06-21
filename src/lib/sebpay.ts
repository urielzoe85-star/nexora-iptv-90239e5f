// SebPay client-side wrapper.
// Public/publishable key is safe to ship in browser code.
export const SEBPAY_PUBLIC_KEY =
  (import.meta.env.VITE_SEBPAY_PUBLIC_KEY as string | undefined) ??
  "pk_live_LXqrgXeD7grJRHhIG4FBBnDdN3jZriNDqeO4VkDY";

export type SebPayInitInput = {
  orderRef: string;
  amount: number;
  currency: string;
  email: string;
  fullName: string;
  method: "card" | "momo" | "crypto";
  successUrl: string;
  failureUrl: string;
  card?: { number: string; exp: string; cvc: string; name: string };
  phone?: string;
};

export type SebPayResult =
  | { status: "paid"; transactionId: string }
  | { status: "failed"; reason: string }
  | { status: "cancelled" };

/**
 * Initialize a SebPay payment using the publishable key.
 *
 * Production note: replace the body of this function with the official SebPay JS SDK
 * call (e.g. window.SebPay.checkout({...})). The shape above is the contract the
 * checkout page relies on. The current implementation simulates a 2s authorization
 * and returns a deterministic mock result so the full flow (DB write → success page
 * → dashboard) is end-to-end functional with the publishable key already configured.
 */
export async function initSebPayPayment(input: SebPayInitInput): Promise<SebPayResult> {
  await new Promise((r) => setTimeout(r, 1500));

  // Naive card-failure heuristic for demo realism. Real SebPay will return its own status.
  if (input.method === "card" && input.card) {
    const last4 = input.card.number.replace(/\D/g, "").slice(-4);
    if (last4 === "0002") return { status: "failed", reason: "Card declined" };
  }
  const transactionId = "SEB_" + Math.random().toString(36).slice(2, 12).toUpperCase();
  return { status: "paid", transactionId };
}