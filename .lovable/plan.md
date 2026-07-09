## Phase 1 — Payment Gateway Manager + CamerPay (SebPay preserved)

Scope: introduce a provider abstraction, add CamerPay (initiate + status + signed webhook), and route by country. **IPTV auto-attribution / stock XLSX / admin UI are out of scope** — the existing post-payment chain (`reactivateAccountsForOrder` → `emitBusinessEvent("payment.confirmed")` → automation queue → WhatsApp/Telegram/Email) is already generic and will fire the same way for CamerPay. That means no regression on SebPay and CamerPay plugs into the exact same delivery pipeline on day one.

### Provider routing

- `CM` (Cameroun) → CamerPay (XAF, Orange Money / MTN MoMo / cartes / PayPal).
- International (any country CamerPay accepts via card/PayPal, not in the West-Africa SebPay list) → CamerPay.
- West Africa (`BJ`, `SN`, `CI`, `TG`, `BF`, `ML`, `NE`, `GN` — countries with a Mobile Money operator in `src/lib/countries.ts` and non-XAF currency) → SebPay.
- Override: if the frontend sends an explicit `provider`, honour it (used by admin re-tries).

### Gateway Manager

New folder `src/lib/payments/` with one file per concern:

- `types.ts` — `PaymentProvider` interface: `initiate(order)`, `verify(order)`, `parseWebhook(req)`, `refund?` (stub for later).
- `manager.ts` — `pickProvider(country, override?)` + `getProvider(name)` registry.
- `sebpay.provider.ts` — thin wrapper around existing `initSebPayCheckout` / `verifyPaymentInternal` / webhook parser (extracted from current route). **Zero behaviour change.**
- `camerpay.provider.ts` — new adapter (see below).
- `router.functions.ts` — new `initCheckout` server fn (validated by Zod) that resolves provider by order country and calls `provider.initiate`. `verifyPayment` in `payments.functions.ts` is generalised to dispatch by `orders.payment_provider`.

### CamerPay adapter

- Base URL from `CAMERPAY_BASE_URL` (default `https://camerpay.biz`).
- Auth: `Authorization: Bearer ${CAMERPAY_API_KEY}` (sandbox and live tokens are distinct — one env var, swapped per environment).
- `initiate`: `POST /api/payment/initiate` with `{ amount, currency:"XAF", customer_phone, customer_email, customer_name, merchant_invoice_id: order.order_ref, merchant_callback_url: "/api/public/camerpay/webhook", merchant_return_url: successUrl, idempotency_key: order.order_ref, source: "nexora-ncc" }`. Store `transaction_uuid` in a new `provider_reference` column and return `pay_url`.
- `verify`: `GET /api/payment/{uuid}/status` → map `completed → paid`, `failed|cancelled → failed`, else `processing`.
- Amount conversion: order already stored in `currency` (XAF for CM). If a non-XAF order is somehow routed to CamerPay, reject at `pickProvider` with a clear error — never silently convert.

### Webhook `POST /api/public/camerpay/webhook`

- `content-type: application/x-www-form-urlencoded` — parse via `await request.formData()`.
- Verify HMAC-SHA256 over `uuid|invoice_id|status|amount` with `CAMERPAY_WEBHOOK_SECRET`, comparing against header `X-CamerPay-Signature` (fallback body `signature`) using `timingSafeEqual`.
- Idempotency: log `X-CamerPay-Event-Id` / `Idempotency-Key` in `delivery_logs`; skip if the same event id already flipped the order.
- Look up order by `merchant_invoice_id` (= `order_ref`). If `status=completed`, run the same transition as SebPay: update to `paid`, call `reactivateAccountsForOrder`, emit `payment.confirmed`. On `failed|cancelled`, emit `payment.failed` with `failure_reason` / `failure_code` captured in metadata.
- Always reply `200 OK` after processing (CamerPay does not retry on 4xx/5xx).

### Database migration (single migration)

- `ALTER TABLE public.orders ADD COLUMN payment_provider text` (nullable; backfill existing rows to `'sebpay'` when `sebpay_reference IS NOT NULL`, else leave null).
- `ALTER TABLE public.orders ADD COLUMN provider_reference text` (nullable; backfill from `sebpay_reference`).
- Keep `sebpay_reference` untouched for backward compat — existing code paths continue to read/write it. New CamerPay flow only writes `provider_reference` + `payment_provider`.
- Index: `CREATE INDEX orders_provider_reference_idx ON public.orders (provider_reference)`.
- No RLS change (orders policies unchanged).

### Secrets

Request via `add_secret` (user pastes from CamerPay dashboard `/client/api`):

- `CAMERPAY_API_KEY` — Bearer token (sandbox first, swap to live after KYC).
- `CAMERPAY_WEBHOOK_SECRET` — the `callback_secret` from CamerPay dashboard.
- `CAMERPAY_BASE_URL` — optional, defaults to `https://camerpay.biz`, can override for staging.

Stored server-side only, read inside handler bodies (never at module scope), never exposed to the client bundle.

### Files touched

**Created**
- `src/lib/payments/types.ts`
- `src/lib/payments/manager.ts`
- `src/lib/payments/sebpay.provider.ts` (wraps existing helpers, no logic change)
- `src/lib/payments/camerpay.provider.ts`
- `src/lib/payments/router.functions.ts` (new `initCheckout` server fn)
- `src/routes/api/public/camerpay/webhook.ts`
- Migration for the two new columns + index + backfill.

**Edited**
- `src/lib/payments.functions.ts` — `verifyPaymentInternal` becomes provider-aware (dispatch on `payment_provider`); SebPay branch unchanged.
- `src/routes/checkout.tsx` — call the new `initCheckout` (which internally routes to SebPay or CamerPay). SebPay UX preserved for West-Africa orders; CamerPay users are redirected to `pay_url`.
- No change to existing SebPay webhook, adapter, or `initSebPayCheckout` — deliberately.

### Deferred to Phase 2 (not in this sprint)

- IPTV stock XLSX import UI + auto-attribution logic (existing `reactivateAccountsForOrder` already handles allocation from the current `iptv_accounts` table; a proper stock table + import UI needs its own sprint).
- Admin NCC page listing payments per provider + webhook replay.
- `refundPayment` implementation on both adapters.

### Success criteria

- SebPay flow (BJ/SN/CI order → MoMo) still works end-to-end.
- CM order → CamerPay `pay_url`, completing the CamerPay sandbox payment triggers `payment.confirmed`, WhatsApp/Telegram/Email fire.
- CamerPay webhook with a tampered signature returns 401 and does not mutate the order.
- Typecheck + build pass.

Confirm and I ship Phase 1 exactly as scoped.