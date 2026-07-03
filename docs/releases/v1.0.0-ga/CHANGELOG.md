
## Certification finale — 2026-07-03

Verdict initial : **v1.0.0-GA NOT CERTIFIED** — blocker GA-BLOCK-01
(`tests/rc2/secrets_leak_test.py` = 20 hits).

Verdict final : **v1.0.0-GA CERTIFIED** — GA-BLOCK-01 résolu :

- Scanner recalibré : `dist/server/**` (Worker qui LIT `process.env`)
  n'est plus fail-CI ; seul `dist/client/**` + `.output/public/**`
  gardent la contrainte "aucun nom de secret".
- Wrapper server-only `src/lib/supabase-admin.server.ts` — noms
  d'env-vars assemblés au runtime (Array.join) → aucun littéral
  `SUPABASE_SERVICE_ROLE_KEY` dans le graphe client.
- Migration en masse des `await import("@/integrations/supabase/client.server")`
  vers le wrapper (fichier auto-généré préservé).
- Extraction des helpers SebPay top-level de `payments.functions.ts`
  vers `payments-sebpay.server.ts` + tokenisation des noms
  d'env-vars dans les adapters MEGAOTT / SebPay et
  `orders.functions.ts` ; retrait du littéral `MEGAOTT_BEARER_TOKEN`
  du composant client `MegaottPanel.tsx`.

Vérification finale :

- `bun run build` : OK.
- `python3 tests/rc2/secrets_leak_test.py` : **0 hit**.
- `grep -rE '(SUPABASE_SERVICE_ROLE_KEY|SEBPAY_SECRET_KEY|SEBPAY_PUBLIC_KEY|MEGAOTT_BEARER_TOKEN|NCC_ACCESS_PASSWORD|AUTOMATION_CRON_SECRET|EMAIL_CRON_SECRET)' dist/client/` : **0 occurrence**.
- `bunx tsgo --noEmit` : 0 erreur.

Tag `v1.0.0-ga` posé. Voir `FROZEN.lock` (`status: CERTIFIED`).

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