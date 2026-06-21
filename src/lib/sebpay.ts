// SebPay client helpers. The publishable key is safe in the browser.
// All charging happens server-side via src/lib/payments.functions.ts; this
// file no longer contains any mock that returns a "paid" status.
export const SEBPAY_PUBLIC_KEY =
  (import.meta.env.VITE_SEBPAY_PUBLIC_KEY as string | undefined) ??
  "pk_live_LXqrgXeD7grJRHhIG4FBBnDdN3jZriNDqeO4VkDY";