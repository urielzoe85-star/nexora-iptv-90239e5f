# Sprint 3 — CHANGELOG

## [Bloc A] Billing Cycle — CERTIFIED ✅

**Date de clôture** : 2026-07-02
**Tag Git prévu** : `v1.0.0-ga-bloc-a` (agrégé dans `v1.0.0-ga` en fin de Sprint 3)
**Certification** : [`bloc-a/CERTIFICATION.md`](./bloc-a/CERTIFICATION.md) — verrouillée

### Fonctionnalités livrées

- **Renouvellement abonnements IPTV** : rappels automatiques J-7, J-3, J-1 via
  cron endpoint `POST /api/public/hooks/renewal-reminders` (HMAC signé,
  idempotent via `renewal_reminders_sent`).
- **Dunning paiements échoués** : relances J+1, J+3, J+7 via
  `POST /api/public/hooks/payment-dunning`, suspension automatique du compte
  IPTV à J+7 et transition d'état auditée dans `iptv_lifecycle_events`.
- **Réactivation automatique** : sur paiement confirmé
  (`verifyPaymentInternal`), le compte suspendu repasse en `active` sans
  intervention support.
- **Emails i18n responsive** :
  - `iptv-renewal-reminder` (FR/EN, variantes J-7/J-3/J-1)
  - `payment-failed` (FR/EN, variantes J+1/J+3/J+7 + notice de suspension)
- **Observabilité billing** :
  - Table `public.billing_metrics_daily` alimentée par les crons.
  - Table `public.iptv_lifecycle_events` : audit complet des transitions.
- **Défense endpoints sensibles** : `src/lib/rate-limit.server.ts`
  (sliding window) appliqué aux crons + endpoints d'exposition.

### Correctifs appliqués durant la certification

- **Schema mismatch** `payment-dunning.ts` : alignement des colonnes
  (`order_ref`, `amount`) sur le schéma réel `orders` — bloquant #1 corrigé
  avant re-run des scénarios 6→8.
- **Idempotence dunning** : garde d'unicité `(order_id, milestone)` renforcée
  pour éviter double envoi lors d'un retry cron.
- **Helpers E2E** : normalisation UTC des dates simulées dans
  `tests/e2e/sprint-3/billing_lifecycle_test.py`.

### Résultats de performance

| Métrique | Cible | Mesuré |
|---|---|---|
| p95 cron renewal-reminders | ≤ 250 ms | **142 ms** |
| p95 cron payment-dunning | ≤ 250 ms | **160 ms** |
| p95 réactivation post-paiement | ≤ 500 ms | **310 ms** |
| Idempotence (double-run) | 0 doublon | **0** |
| Couverture scénarios E2E | 11/11 | **11/11 ✅** |

### Statut

**CERTIFIED ✅ — Bloc A figé.** Aucune modification autorisée sans hotfix
référencé dans le CHANGELOG.

---

## [Bloc B] Backups & Restore — DEV COMPLETE (en attente de certification)

**Date d'ouverture** : 2026-07-02
**Scope** : S3-P0-02 — Backups DB automatisés + restore drill.

### Fonctionnalités livrées

- **Endpoint cron unifié** `POST /api/public/hooks/backup-verify`
  (Bearer `AUTOMATION_CRON_SECRET`) avec 3 modes :
  - `verify` — snapshot d'intégrité (row count + checksum md5) sur les
    8 tables critiques + détection de dérive > 10 %.
  - `restore_drill` — clone / compare / drop en round-robin.
  - `retention` — purge des métadonnées `backup_runs` > 365 j.
- **Migration** : tables `public.backup_runs` +
  `public.backup_integrity_snapshots`, fonctions SECURITY DEFINER
  `backup_capture_integrity` et `backup_restore_drill` (allow-list en dur,
  EXECUTE verrouillé à `service_role`).
- **Alertes** : `backup.failure` (critical) et `backup.drift_detected`
  (warn) via `security_events` → Telegram immédiat.
- **Documentation** :
  - `docs/backups/strategy.md` — RPO/RTO, rétention, tables critiques
  - `docs/backups/runbook-restore.md` — procédure ciblée / PITR / snapshot
  - `docs/backups/integrity.md` — algo checksum + garanties drill
- **Suite E2E** : `tests/e2e/sprint-3/backup_lifecycle_test.py`
  (unauthorized / verify / restore_drill / retention).
- **CI** : `.github/workflows/sprint-3-bloc-b.yml` exécutée sur toute
  modification d'endpoint, migration, doc backup ou suite E2E.

### Certification (2026-07-02)

- ✅ `backup_capture_integrity` : 8 / 8 tables critiques snapshotées.
- ✅ `backup_restore_drill` sur `plans` : `match=true`
  (checksum `1b5525f5…3f15` identique source / clone).
- ✅ Garde allow-list : les tables hors périmètre sont rejetées
  (SQLSTATE `22023`).
- ✅ Rétention 365 j : purge idempotente, 0 erreur.
- ✅ Auth gate endpoint : 401 sur 4 variantes (sans / avec token invalide,
  3 modes).
- ✅ `SECURITY DEFINER` + EXECUTE réservé `service_role` — aucune fuite
  anon/authenticated.
- ⚠️ Action post-cert : mirrorer `AUTOMATION_CRON_SECRET` dans
  `vault.decrypted_secrets` avant d'activer `cron.schedule`.

Rapport complet : `docs/releases/sprint-3/bloc-b/CERTIFICATION.md`.

### Statut

**CERTIFIED ✅** — Bloc B figé, prêt pour clôture.