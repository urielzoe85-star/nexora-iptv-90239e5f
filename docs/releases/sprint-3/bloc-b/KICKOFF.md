# Sprint 3 · Bloc B — Backups & Restore (S3-P0-02)

_Status: **DEV COMPLETE — en attente de certification**_
_Prérequis : Bloc A CERTIFIED ✅ (verrouillé le 2026-07-02)_

## Méthodologie

`Développement → Tests → Certification → Bloc figé → Bloc suivant`
Aucun Bloc C ne sera ouvert tant que le Bloc B n'est pas CERTIFIED.

## Périmètre livré

Stratégie de sauvegarde et de restauration de niveau production :

- sauvegardes physiques managées par la plateforme (PITR + snapshots),
  documentées ;
- contrôles applicatifs quotidiens (empreinte + drill) prouvant que les
  données sont exploitables ;
- rétention documentée (quotidienne / hebdo / mensuelle côté plateforme,
  365 j côté métadonnées applicatives) ;
- procédure de restauration versionnée
  (`docs/backups/runbook-restore.md`) ;
- test de restauration automatisé (round-robin sur 8 tables critiques) ;
- vérification d'intégrité (row count + checksum md5) avec détection de
  dérive > 10 % ;
- alertes Telegram immédiates sur `backup.failure` (critical) et
  `backup.drift_detected` (warn) via `security_events`.

## Livrables

| Livrable | Chemin |
|---|---|
| Endpoint cron (verify / restore_drill / retention) | `src/routes/api/public/hooks/backup-verify.ts` |
| Migration (tables + fonctions SECURITY DEFINER) | `supabase/migrations/*_backup_runs*.sql` |
| Stratégie | `docs/backups/strategy.md` |
| Runbook restauration | `docs/backups/runbook-restore.md` |
| Intégrité & drills | `docs/backups/integrity.md` |
| Suite E2E | `tests/e2e/sprint-3/backup_lifecycle_test.py` |
| CI dédiée | `.github/workflows/sprint-3-bloc-b.yml` |

## Certification — checklist

- [ ] Test `verify` : snapshot capturé sur 8 tables critiques.
- [ ] Test `restore_drill` : `match = true` sur `customers`.
- [ ] Test `retention` : nettoyage sans erreur.
- [ ] Test `unauthorized` : 401 sans token.
- [ ] `backup_runs` alimenté avec durées + statut.
- [ ] Alerte simulée : entrée `security_events` type `backup.failure`
      lors d'un échec forcé.
- [ ] Rapport `docs/releases/sprint-3/bloc-b/CERTIFICATION.md` rédigé
      et signé.

## Installation du cron (à effectuer post-certification)

```sql
select cron.schedule(
  'backup-verify-daily', '0 2 * * *',
  $$ select net.http_post(
    url:='https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/hooks/backup-verify',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='AUTOMATION_CRON_SECRET')
    ),
    body:='{"mode":"verify"}'::jsonb
  ); $$
);
select cron.schedule(
  'backup-restore-drill-daily', '15 2 * * *',
  $$ select net.http_post(
    url:='https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/hooks/backup-verify',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='AUTOMATION_CRON_SECRET')
    ),
    body:='{"mode":"restore_drill"}'::jsonb
  ); $$
);
select cron.schedule(
  'backup-retention-monthly', '0 3 1 * *',
  $$ select net.http_post(
    url:='https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/hooks/backup-verify',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='AUTOMATION_CRON_SECRET')
    ),
    body:='{"mode":"retention"}'::jsonb
  ); $$
);
```