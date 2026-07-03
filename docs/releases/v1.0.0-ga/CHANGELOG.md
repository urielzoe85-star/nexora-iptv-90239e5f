
## Certification finale — 2026-07-03

Verdict : **v1.0.0-GA NOT CERTIFIED**.

Blocker : `tests/rc2/secrets_leak_test.py` remonte 20 hits (0 à
`v1.0.0-security`). Voir `CERTIFICATION.md` §5. Tag `v1.0.0-ga`
non posé tant que le correctif GA-BLOCK-01 n'est pas livré.
# CHANGELOG — v1.0.0-ga

_Date: 2026-07-03 · General Availability_

## Ajouts

### Billing (Bloc A)
- Cron `renewal-reminders-daily` + endpoint idempotent J-7 / J-3 / J-1.
- Dunning payment-failed : J+1 / J+3 / J+7 + suspension automatique.
- Table `renewal_reminders_sent` (idempotence).

### Continuité (Bloc B)
- Endpoint `/api/public/hooks/backup-verify` + runbook restore.
- Documentation stratégie backup (RPO 24 h / RTO 4 h).

### Compliance (Bloc C)
- Pages légales : `/legal/{terms,sales,privacy,refund,notice}`.
- Acceptation CGV obligatoire au checkout + audit `terms_version`.
- `LEGAL_VERSION = 2026-07-03`.

### Sécurité (Bloc D)
- CSP report-only + `/api/public/csp-report` (audit `csp.violation`).
- Helpers SRI (`src/lib/sri.ts`).
- `scripts/sign-artifacts.mjs` (ed25519 optionnel).

### Résilience (Bloc E)
- Endpoint `/api/public/hooks/secret-rotation-check` (wake scan).
- Chaos suite : `kill_provider`, `saturate_queue`, `corrupt_webhook`.

### Qualité GA (Bloc F)
- Endpoint `/api/public/hooks/slo-snapshot` (Grafana-ready).
- Fuzz Zod, load 100 rps, visual regression Playwright.

## Corrections

- Aucun bug bloquant identifié depuis `v1.0.0-security`.

## Risques acceptés

Voir `CERTIFICATION.md` §Risques acceptés.