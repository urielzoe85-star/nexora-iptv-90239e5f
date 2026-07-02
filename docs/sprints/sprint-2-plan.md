# Sprint 2 — Sécurité / RLS / Hardening

_Base : NEXORA™ ERP v1.0.0-RC1 (certifié 2026-07-02)_
_Durée cible : 2 semaines_

## Objectif

Élever la posture sécurité de la plateforme à un niveau production-grade en (1) verrouillant l'ensemble des politiques RLS, (2) durcissant les surfaces publiques et (3) supprimant les vecteurs d'escalade de privilèges résiduels. Sortie : v1.0.0-RC2, prête pour audit externe.

## Périmètre

**Inclus** — RLS exhaustive, rate-limiting applicatif, rotation secrets, headers de sécurité, audit trail, hardening des server functions, tests RLS automatisés.

**Exclu** — nouvelles features métier, refonte UI, i18n, billing récurrent.

## Objectifs mesurables

| # | Objectif | Métrique |
|---|---|---|
| G1 | RLS 100 % des tables `public` | 0 table sans policy ; 0 policy `USING (true)` sauf whitelist justifiée. |
| G2 | Aucun SECURITY DEFINER exécutable par `anon`/`authenticated` sans has_role check | Linter Supabase : 0 finding critique. |
| G3 | Rate limiting sur toutes les surfaces publiques `/api/public/*` | Bucket applicatif (IP + route) sur 100 % des routes ; tests de charge < 429 attendu. |
| G4 | Aucune PII dans les logs applicatifs ni `integration_debug_logs` | Scan automatisé (regex email/tél/token) : 0 hit sur 30 jours glissants. |
| G5 | Headers sécurité complets sur toutes les routes publiques | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy → note A sur securityheaders.com. |
| G6 | Tests RLS automatisés | ≥ 90 % des policies couvertes par un test `anon` / `authenticated` / `admin`. |

## Tâches

### Bloc A — RLS Coverage & Audit (5 j)

- A1. Générer l'inventaire des 25 tables `public` + policies existantes (RPC + rapport MD).
- A2. Identifier les tables sans RLS ou avec policies larges → tableau blocages / risques.
- A3. Écrire les policies manquantes (par table) + tests RLS (voir bloc E).
- A4. Auditer chaque fonction SECURITY DEFINER : `REVOKE EXECUTE FROM anon,authenticated` sauf whitelist ; ajouter `has_role` où pertinent.
- A5. Revue des GRANTs `public.*` par rôle (`anon`, `authenticated`, `service_role`).

### Bloc B — Surface publique / Webhooks (3 j)

- B1. Rate limiting applicatif — table `rate_limit_buckets` + middleware server-route (IP+route+fenêtre glissante).
- B2. Timing-safe HMAC vérifié sur 100 % des webhooks (`sebpay`, `telegram`, futurs).
- B3. Rotation programmée `AUTOMATION_CRON_SECRET`, `SEBPAY_SECRET_KEY`, `email_queue_cron_secret` (procédure + doc).
- B4. Ajout headers sécurité (CSP + HSTS + X-Frame + Referrer-Policy + Permissions-Policy) via response headers middleware.

### Bloc C — Server functions & auth (2 j)

- C1. Audit `createServerFn` : chaque fn mutation doit exiger `requireSupabaseAuth` + role check explicite.
- C2. Middleware `requireAdmin` réutilisable + refacto des routes admin.
- C3. Interdire l'usage de `supabaseAdmin` en dehors des handlers `.server.ts` (lint custom + revue).

### Bloc D — Observabilité & audit trail (2 j)

- D1. Table `security_events` (append-only) + policy admin-read-only.
- D2. Émission : login échec, role grant, service key usage, `NXR-E2E-*` détecté en prod.
- D3. Alerte simple (Telegram bot existant) sur événements critiques.

### Bloc E — Tests RLS automatisés (3 j)

- E1. Framework Python : 3 clients Supabase (anon / user / admin) + fixtures.
- E2. 1 test par policy : ✅ accès autorisé attendu, ❌ accès refusé attendu.
- E3. Intégration au harness RC (`tests/rc2/`).
- E4. Rapport `rls-coverage.json` (target ≥ 90 %).

### Bloc F — Documentation & release (1 j)

- F1. `docs/security/threat-model.md` (STRIDE court).
- F2. `docs/security/runbook.md` (rotation secrets, incident response).
- F3. CHANGELOG v1.0.0-RC2.

## Critères d'acceptation (Definition of Done)

1. **RLS** — `supabase--linter` retourne 0 finding `ERROR` / `WARNING` critique.
2. **Coverage tests** — `rls-coverage.json` ≥ 90 % des policies couvertes, 0 test rouge.
3. **Headers** — audit securityheaders.com ≥ A sur `nexora-iptv.com` et `www.nexora-iptv.com`.
4. **Rate limiting** — test de charge 200 req/s → réponses 429 conformes ; aucune 5xx non-attendue.
5. **PII scan** — 0 match sur logs des 30 derniers jours (patterns email, téléphone, tokens SebPay/MEGAOTT).
6. **Audit trail** — événements critiques (grant admin, service key call, e2e-ref prod) tracés + alertés en < 5 min.
7. **Certification** — nouveau run harness `tests/rc2/` renvoie `RC2 CERTIFIED`.
8. **Documentation** — threat-model, runbook, changelog livrés et relus.

## Livrables

- Migrations SQL : policies RLS complètes + `security_events` + `rate_limit_buckets`.
- Code : middlewares (rate-limit, headers, requireAdmin), helpers HMAC unifiés.
- Tests : `tests/rc2/` (harness + rls-coverage).
- Docs : `docs/security/threat-model.md`, `docs/security/runbook.md`, `docs/releases/v1.0.0-rc2/CHANGELOG.md`.
- Artefacts certification : `rls-coverage.json`, `security-headers.json`, `rate-limit-load.json`, `pii-scan.json`.

## Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Policy trop restrictive casse un flow métier | Régression prod | Chaque migration RLS testée contre les scénarios RC1 avant merge. |
| Rate limiting bloque un vrai partenaire | Livraison bloquée | Whitelist IP configurable + observabilité 429 avant enforcement dur. |
| Rotation secret casse le cron | Automation stoppée | Fenêtre de double-secret (old+new acceptés) pendant la rotation. |

## Prérequis

- v1.0.0-RC1 taggée et archivée (✅ fait).
- Aucun feature-work concurrent sur les tables touchées.
- Accès Vault Supabase (secrets rotation).

## Planning indicatif

```text
S1  ├─ Bloc A (RLS)            ██████████████
    ├─ Bloc B (surface pub)         ██████████
    └─ Bloc E kickoff                    ████
S2  ├─ Bloc C (server fns)     ████████
    ├─ Bloc D (audit trail)        ████████
    ├─ Bloc E (finalisation)               ██████████
    └─ Bloc F (docs + release)                        ████
```