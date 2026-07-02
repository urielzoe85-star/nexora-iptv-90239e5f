# CHANGELOG — v1.0.0-security (Sprint 2)

_Release date: 2026-07-02_
_Predecessor: v1.0.0-rc1_

Sprint 2 "Security Hardening" delivered in six blocks (A→F). No functional
regression; no breaking change on public API. All RC1 workflows remain
backward compatible.

## Highlights

- 100% RLS coverage across the 25 public tables.
- Unified HMAC verification for every inbound webhook.
- Centralised admin authorization (`requireAdmin`) on 93 server functions.
- Full audit trail (`public.security_events`) with Telegram alerting.
- Hardened admin role management (RPC + atomic guards).
- Complete secrets inventory, rotation runbook and CI leak detection.

---

## Bloc A — RLS Coverage & Audit

**Added**
- Audit report `docs/security/rls-audit.md` (25 tables, 100% RLS enabled).
- `has_role()` helper (SECURITY DEFINER) reused as the single source of truth
  for policy checks.

**Fixed**
- Restricted every `SECURITY DEFINER` function to `service_role` / callable
  roles only.
- Removed accidental `PUBLIC` grants on privileged helpers.

**Migrations**
- `enable_rls_all_public_tables`
- `grant_matrix_public_schema`

## Bloc B — Hardening & Headers

**Added**
- Unified HMAC verification middleware for SebPay and automation webhooks.
- Security headers on every response: `HSTS`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Automated coverage: `tests/rc2/security_headers_test.py`.
- CSP follow-up ticket: `docs/security/csp-followup.md`.

**Notes**
- CSP left in report-only mode; strict CSP is Sprint 3 backlog.

## Bloc C — Server functions & Auth

**Added**
- `src/lib/require-admin.ts` middleware — used on 93 server functions.
- Client-bundle guardrail: `tests/rc2/no_admin_toplevel_test.py` prevents
  `client.server` from being imported at top-level of `*.functions.ts`.
- Audit report `docs/security/bloc-c-audit.md`.

**Fixed**
- Removed all remaining unauthenticated privileged endpoints.
- Isolated `supabaseAdmin` behind lazy imports inside handlers.

## Bloc D — Audit Trail

**Added**
- Table `public.security_events` (severity, event_type, payload, request_id,
  target_user_id, actor_user_id, created_at) with RLS.
- Helper `recordSecurityEvent()` (`src/lib/security-events.server.ts`).
- Telegram alerting on `severity IN ('warn','critical')`.
- Instrumentation in: SebPay webhook, MEGAOTT adapter, automation queue,
  admin role mutations, transactional email.
- Documentation: `docs/security/bloc-d-audit-trail.md`.

**Migrations**
- `create_security_events_table`
- `security_events_add_request_id_target_user`

## Bloc E — Admin Role Guards

**Added**
- RPC `public.admin_change_role(target_user_id, new_role)` with
  `FOR UPDATE` locks (atomic).
- Guards: no self-demotion; at least one active admin must remain.
- Wired into `adminAddAdmin` / `adminRemoveAdmin` (`src/lib/admin.functions.ts`).
- E2E harness: `tests/rc2/admin_role_change_test.py` (15 checks, all green).
- Documentation: `docs/security/bloc-e-role-guards.md`.

**Migrations**
- `admin_change_role_rpc`

## Bloc F — Secrets & Rotation

**Added**
- Inventory of 11 logical secrets with owner / criticality / cadence:
  `docs/security/bloc-f-secrets.md`.
- Rotation playbook per secret with rollback, grace window, canary:
  `docs/security/secret-rotation.md`.
- Helper `src/lib/secret-guard.server.ts` (`requireSecret`, `noteSecretUse`).
- Table `public.secret_registry` + cron `secret_registry_scan()` — emits
  `secret.expired`, `secret.expiring_soon`, `secret.missing`,
  `secret.invalid_use` into `public.security_events`.
- CI scanner `tests/rc2/secrets_leak_test.py` — scans repo, client bundle,
  build artefacts, logs and RC artefacts (0 leak).

**Migrations**
- `create_secret_registry`
- `schedule_secret_registry_scan`

**Vault**
- `email_queue_cron_secret`, `email_queue_service_role_key` migrated.
- 9 remaining secrets kept in Lovable Cloud env (justified — see Bloc F doc).

---

## Breaking changes

**None** on public surfaces. Two internal changes require awareness for
contributors:

1. Any new server function that mutates admin state MUST go through
   `public.admin_change_role` — direct writes on `public.user_roles` from
   application code are rejected by RLS.
2. Any new `*.functions.ts` file MUST NOT top-level-import
   `@/integrations/supabase/client.server` — the CI guard fails the build.

## Test coverage (Sprint 2)

| Suite | Status |
|---|---|
| `tests/rc2/secrets_leak_test.py` | ✅ 0 leak |
| `tests/rc2/security_headers_test.py` | ✅ (published env) |
| `tests/rc2/no_admin_toplevel_test.py` | ✅ 10 files, 0 hit |
| `tests/rc2/admin_role_change_test.py` | ✅ 15/15 |
| RC1 regression suite | ✅ unchanged |

## Tagging

Recommended Git tag: `v1.0.0-security`.
Note: on Lovable, Git tags are managed via the GitHub integration
(create the tag on the connected repository once the release commit lands).