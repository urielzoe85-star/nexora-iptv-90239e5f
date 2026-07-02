# Sprint 3 — Kickoff

_Opened: 2026-07-02 · Target release: v1.0.0-ga_

Sprint 2 (`v1.0.0-security`) frozen and certified. Sprint 3 opens on the
backlog defined in `docs/sprints/sprint-3-plan.md`.

## Découpage exécution

On garde la cadence Sprint 2 : un Bloc à la fois, validation utilisateur
entre chaque Bloc.

| Bloc | Portée | Items backlog |
|---|---|---|
| **A — Billing Cycle** | Renouvellements + dunning | S3-P0-03, S3-P0-04 |
| **B — Continuité & SLO** | Backups vérifiés, métriques SLO, restore drill | S3-P0-02, S3-P0-05 |
| **C — Compliance publique** | CGU/CGV, acceptation checkout | S3-P0-06 |
| **D — Défense en profondeur** | CSP stricte, SRI, signature artefacts | S3-P1-01, S3-P1-02, S3-P1-04 |
| **E — Résilience** | Chaos suite, rotation auto secrets | S3-P1-03, S3-P1-05 |
| **F — Qualité GA** | Dashboards SLO, fuzzing, load, visual regression | S3-P2-* |

## Note importante — Rate limiting (S3-P0-01)

La plateforme n'a pas de primitive de rate limiting standard côté backend.
Toute limitation reste ad-hoc au niveau du handler concerné. On documente
ce gap comme risque accepté et on le traitera quand une infra dédiée
(edge rate limiter) sera disponible. **Item retiré de la scope P0
bloquante** pour ne pas retarder GA sur une brique indisponible.

## Bloc A — En cours

Livrables :

1. Endpoint cron `/api/public/hooks/renewal-reminders` — scan quotidien
   des `iptv_accounts` expirant à J-7 / J-3 / J-1, enqueue email de rappel
   (idempotent par jalon).
2. Cron pg_cron `renewal-reminders-daily` (à installer via
   `supabase--insert` après merge).
3. Table `public.renewal_reminders_sent` pour idempotence.
4. Workflow dunning : `payment-failed` étend son plan de relance
   (J+1 / J+3 / J+7 puis suspension automatique).
5. Tests E2E : `tests/e2e/sprint-3/renewals_test.py`.

Premier livrable posé dans ce commit : endpoint cron + squelette
idempotence. Suite des livrables sur validation.