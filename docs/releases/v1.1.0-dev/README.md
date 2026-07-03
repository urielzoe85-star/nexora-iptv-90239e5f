# NEXORA ERP — v1.1.0-dev

_Ouverture : 2026-07-03 · Successeur de `v1.0.0-ga`_

Ligne de développement post-GA. Toute nouvelle évolution (features,
refactors non-critiques, dette technique) est isolée ici afin de
préserver la stabilité de `v1.0.0-ga`.

## Règles

- La branche `v1.1.0-dev` (Git) est la branche d'intégration par défaut
  pour les nouveaux tickets Sprint 4+.
- Aucun merge direct vers la ligne `v1.0.0-ga` : seuls les hotfixes
  référencés dans `docs/releases/v1.0.0-ga/CHANGELOG.md` sont autorisés,
  et doivent être backportés explicitement.
- Chaque feature majeure ouvre son propre kickoff sous
  `docs/releases/v1.1.0-dev/kickoffs/`.

## Backlog initial (Sprint 4 pressenti)

1. **Rate limiting edge** — infra dédiée (remplace le fallback ad-hoc
   `src/lib/rate-limit.server.ts`).
2. **Rotation secrets automatisée** — bot planifié + PR automatique.
3. **Chaos live** — promotion des scénarios `kill_provider`,
   `saturate_queue`, `corrupt_webhook` en gate CI staging.
4. **Suivi SLO 7 j** — dashboard Grafana persistant + alertes budgétées.
5. **Nouveaux connecteurs IPTV** — pipeline `integration-hub` étendu.

## Certification

Aucune certification tant que le scope Sprint 4 n'est pas verrouillé.
La v1.0.0-GA reste la référence stable production.