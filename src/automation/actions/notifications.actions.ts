// Placeholder — les notifications client seront branchées en v1.7.

export async function notifyCustomerNoop(payload: Record<string, unknown>) {
  return { skipped: true, reason: "notifications désactivées en v1.6", payload };
}