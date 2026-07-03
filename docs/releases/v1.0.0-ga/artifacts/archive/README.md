# Archive de certification — v1.0.0-GA

Archive figée le 2026-07-03. Contenu :

- `rc1/` — baseline RC1 (full journey, webhook replay, provider fallback,
  DB integrity, logs audit, workflow chain, perf).
- `sprint-2/` — artefacts de la certification `v1.0.0-security` (RC2 :
  secrets leak, no-admin-toplevel, admin role change, security headers +
  audits sécurité + runbooks).
- `sprint-3/` — kickoffs, certifications et changelog des Blocs A → F.
- `ga/` — sorties RC2 finales de la certification GA (secrets leak à 0
  hit, headers, no-admin-toplevel, admin role change).

Aucun de ces fichiers ne doit être modifié après gel. Toute correction
post-GA doit passer par un hotfix référencé dans
`docs/releases/v1.0.0-ga/CHANGELOG.md`.