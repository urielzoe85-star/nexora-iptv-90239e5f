# Secret Rotation Runbook — NEXORA™ ERP

_Last updated: Sprint 2 · Bloc B_

This runbook documents how to rotate every secret used by the platform.
All secrets are stored in Lovable Cloud (Edge Function Secrets) and, for
SQL-side callers, mirrored into Supabase Vault.

## Inventory

| Secret | Where used | Rotation impact |
| --- | --- | --- |
| `SEBPAY_SECRET_KEY` | `verifyPaymentInternal`, SebPay webhook HMAC | Must be rotated in SebPay dashboard simultaneously; short window of 401s possible |
| `SEBPAY_PUBLIC_KEY` | Client-side checkout | Publishable; safe to expose |
| `MEGAOTT_BEARER_TOKEN` | `megaott.adapter.ts` upstream calls | New token must be minted in MegaOTT panel first, then swapped |
| `NCC_ACCESS_PASSWORD` | Back-office access gate | Notify all operators, ≥12 chars |
| `AUTOMATION_CRON_SECRET` | `automation/process-queue` bearer | Update pg_cron schedule payload in the same transaction |
| `EMAIL_CRON_SECRET` | Email queue dispatcher (Vault: `email_queue_cron_secret`) | Rotate Vault entry via SQL, then update caller |
| `email_queue_service_role_key` (Vault only) | `email_queue_wake` / `_dispatch` net.http_post | Only rotated on service role key rotation |
| `LOVABLE_API_KEY` | Lovable AI Gateway calls | Use `lovable_api_key--rotate_lovable_api_key` tool only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged writes | Managed by Lovable Cloud; not manually rotatable |

## Standard rotation procedure

1. Generate the new value in the upstream provider (or via `generate_secret` for internal signing secrets).
2. Store the new value with `update_secret` for the target name.
3. If the secret is also referenced from SQL (`email_queue_*`), update the Vault entry in the same window:
   ```sql
   SELECT vault.update_secret(id, '<new-value>')
   FROM vault.secrets WHERE name = 'email_queue_cron_secret';
   ```
4. Trigger a small canary call (webhook replay, cron manual run) and confirm it succeeds.
5. Revoke the old value upstream **after** verifying the new one.

## Cadence

- Payment (`SEBPAY_*`): every 90 days or on incident.
- Cron / internal HMAC (`AUTOMATION_CRON_SECRET`, `EMAIL_CRON_SECRET`): every 180 days.
- Provider bearers (`MEGAOTT_BEARER_TOKEN`): follow provider policy.
- Access gates (`NCC_ACCESS_PASSWORD`): on operator turnover.

## Rate limiting note

No standard rate-limiting primitive is enabled at the platform layer.
If a specific endpoint needs throttling, implement it ad-hoc in the
handler and document the decision here.