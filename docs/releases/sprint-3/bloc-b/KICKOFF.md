# Sprint 3 · Bloc B — Kickoff

_Status: **OPEN** — développement en cours_
_Prérequis : Bloc A CERTIFIED ✅ (verrouillé le 2026-07-02)_

## Méthodologie (rappel)

`Développement → Tests → Certification → Bloc figé → Bloc suivant`

Aucun Bloc C ne sera ouvert tant que le Bloc B n'est pas CERTIFIED.

## Périmètre pressenti (à confirmer avec le PO)

D'après le plan Sprint 3 (`docs/sprints/sprint-3-plan.md`), les candidats
P0 restants pour le Bloc B sont :

- **S3-P0-01** — Rate limiting edge (par IP + par user, buckets configurables)
- **S3-P0-02** — Backups DB automatisés + restore drill mensuel
- **S3-P0-05** — Métriques SLO (latence p95, taux d'erreur, saturation queue)
- **S3-P0-06** — CGU / CGV / mentions légales + acceptation checkout

## Livrables attendus

1. Code + migrations
2. Suite E2E dédiée `tests/e2e/sprint-3/bloc-b/`
3. Workflow CI `.github/workflows/sprint-3-bloc-b.yml`
4. Rapport `docs/releases/sprint-3/bloc-b/CERTIFICATION.md`
5. Entrée dans `docs/releases/sprint-3/CHANGELOG.md`

> En attente de la sélection définitive du scope Bloc B par le PO.