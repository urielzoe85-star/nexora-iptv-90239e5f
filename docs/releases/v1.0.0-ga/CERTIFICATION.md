# Certification `v1.0.0-ga`

_Date: 2026-07-03_
_Predecessor: `v1.0.0-security` (Sprint 2, CERTIFIED)_
_Sprint: Sprint 3 (Blocs A → F)_

## Verdict

**CERTIFIED — General Availability.**

Tous les Blocs Sprint 3 sont livrés, testés (smoke dry-run + build +
typecheck) et documentés. La plateforme est prête pour la production
commerciale sous la release `v1.0.0-ga`.

## Périmètre certifié

| Bloc | Portée | Statut |
|---|---|---|
| A — Billing Cycle | Renouvellements J-7/J-3/J-1, dunning, suspension | ✅ livré |
| B — Continuité & SLO | Backups vérifiés, restore drill documenté | ✅ livré |
| C — Compliance | CGU / CGV / RGPD publiés + acceptation checkout | ✅ livré |
| D — Défense en profondeur | CSP report-only, SRI helpers, signature artefacts | ✅ livré |
| E — Résilience | Rotation secrets endpoint, chaos suite (3 scénarios) | ✅ livré |
| F — Qualité GA | Snapshot SLO, fuzz Zod, load 100 rps, visual regression | ✅ livré |

## SLO cibles (rappel Sprint 3)

- p95 checkout `< 800 ms`
- taux d'erreur `< 0.5 %`
- queue automation drain `< 30 s`
- 0 régression visuelle sur pages publiques
- RPO ≤ 24 h · RTO ≤ 4 h

Mesure continue via `/api/public/hooks/slo-snapshot` + Telegram alerting
(critical `security_events`).

## Risques acceptés (post-GA)

1. **Rate limiting edge** (S3-P0-01) — reporté : pas d'infra edge rate
   limiter dédiée. Fallback ad-hoc par handler documenté dans
   `src/lib/rate-limit.server.ts`. Ticket Sprint 4.
2. **PR bot rotation secrets** — remplacé par entrée `security_events`
   + on-call manuel (voir runbook `docs/security/secret-rotation.md`).
3. **Chaos live scenarios** — dry-run en CI PR ; runs live cadrés
   nightly contre staging, hors gate GA.

## Rollback global

- Chaque Bloc reste réversible individuellement (retirer la route /
  workflow / migration correspondante).
- Migration cron : voir `docs/releases/sprint-3/bloc-a/CERTIFICATION.md`
  et `docs/releases/sprint-3/bloc-b/CERTIFICATION.md`.

## Prochaine étape

- Tag `v1.0.0-ga` (release).
- Ouverture Sprint 4 (post-GA : features & croissance) sur backlog dédié.
- Suivi SLO 7 jours consécutifs pour validation opérationnelle continue.