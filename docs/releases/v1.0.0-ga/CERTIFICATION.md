# Certification `v1.0.0-ga`

_Date: 2026-07-03_
_Predecessor: `v1.0.0-security` (Sprint 2, CERTIFIED)_
_Sprint: Sprint 3 (Blocs A → F)_
_Run: certification finale demandée par le PO_

## Verdict

**v1.0.0-GA NOT CERTIFIED** — 1 régression sécurité critique par rapport
à `v1.0.0-security`. Le tag `v1.0.0-ga` n'est **pas** posé.

Voir « Correctifs requis » plus bas ; tout le reste (typecheck, build,
livrables Sprint 3 A→F, suites smoke) passe.

## 1. Résumé exécutif

| Domaine | Résultat | Détail |
|---|---|---|
| Typecheck (`tsgo --noEmit`) | ✅ | 0 erreur |
| Build production (`bun run build`) | ✅ | dist/client + dist/server générés |
| Lint (Prettier/ESLint) | ⚠ | Style-only (formatage), non bloquant |
| RC2 · secrets leak (`tests/rc2/secrets_leak_test.py`) | ❌ | 20 hits — **régression vs security (0 hit)** |
| RC2 · admins role change | ✅ | Toutes garanties Bloc E |
| RC2 · no admin top-level import | ✅ | 0 import top-level de `admin.functions` |
| RC2 · security headers | dry-run | Headers vérifiés en live seulement |
| RC1 · full journey / webhook replay / provider fallback | ⏸ | Requiert env live (Supabase + SebPay). Baseline v1.0.0-rc1 archivée : `docs/releases/v1.0.0-rc1/artifacts/RC1-REPORT.md` |
| Chaos suite (kill_provider / saturate_queue / corrupt_webhook) | ✅ dry-run | Live exécuté nightly staging |
| Quality suite (fuzz Zod / 100 rps / visual regression) | ✅ dry-run | Live exécuté nightly staging |
| Sprint 3 blocs A → F | ✅ | Kickoffs + workflows livrés (voir §2) |

## 2. Modules certifiés (Sprint 3)

| Bloc | Portée | Statut |
|---|---|---|
| A — Billing Cycle | Renouvellements J-7/J-3/J-1, dunning, suspension | ✅ livré |
| B — Continuité & SLO | Backups vérifiés, restore drill documenté | ✅ livré |
| C — Compliance | CGU / CGV / RGPD + acceptation checkout | ✅ livré |
| D — Défense en profondeur | CSP report-only, SRI helpers, signature artefacts | ✅ livré |
| E — Résilience | Rotation secrets endpoint + chaos suite | ✅ livré |
| F — Qualité GA | Snapshot SLO, fuzz Zod, load 100 rps, visual regression | ✅ livré |

## 3. Résultats des tests

### 3.1 Typecheck & build
`bunx tsgo --noEmit` : 0 erreur. `bun run build` : `✓ built in 1.27s`,
worker Nitro généré (`dist/server/wrangler.json`, `dist/nitro.json`).

### 3.2 Sécurité (RC2)

**secrets_leak_test — ❌ 20 hits**

- **2 hits `[bundle]`** — pattern JWT (`eyJ…`) présent dans
  `dist/client/assets/index-*.js` et `dist/server/_ssr/client-*.mjs`.
  Vérification manuelle : correspond à la clé **anon publishable** (JWT
  légitime côté client). Le pattern regex ne distingue pas anon vs
  service_role. Faux positif documenté.
- **18 hits `[bundle-forbidden]`** — les identifiants
  `SUPABASE_SERVICE_ROLE_KEY`, `SEBPAY_SECRET_KEY`,
  `MEGAOTT_BEARER_TOKEN`, `AUTOMATION_CRON_SECRET`,
  `NCC_ACCESS_PASSWORD` apparaissent en tant que chaînes littérales
  dans des chunks présents à la fois côté serveur **et** côté client :
  - `dist/client/assets/client.server-*.js` :: SUPABASE_SERVICE_ROLE_KEY
  - `dist/client/assets/integration-hub-*.js` :: SEBPAY_SECRET_KEY, MEGAOTT_BEARER_TOKEN
  - `dist/client/assets/ncc.iptv.providers-*.js` :: MEGAOTT_BEARER_TOKEN
  - `dist/client/assets/payments.functions-*.js` :: SEBPAY_SECRET_KEY
  - ... + 13 hits côté serveur (attendus, mais listés par le test).

  **Aucune valeur secrète en clair** n'est présente ; seuls les *noms*
  de variables `process.env.*` sont exposés. C'est néanmoins la
  violation du contrat « les modules `.server.ts` / privilégiés ne
  doivent pas atteindre `dist/client/` », contrat qui était tenu (0
  hit) à la certification `v1.0.0-security`. → **Régression bloquante**.
  Rapport complet : `docs/releases/v1.0.0-ga/artifacts/rc2-secrets-leak.txt`.

**Autres RC2**
- `no_admin_toplevel_test.py` — ✅ 10 fichiers scannés, 0 import top-level.
- `admin_role_change_test.py` — ✅ toutes les garanties Bloc E OK.
- `security_headers_test.py` — non exécuté en live sur cet environnement
  (nécessite serveur en écoute). En dry-run, la liste d'endpoints à
  couvrir est bien construite.

### 3.3 Chaîne complète (RC1 baseline)

RC1 nécessite Supabase + SebPay live. Baseline officielle archivée dans
`docs/releases/v1.0.0-rc1/artifacts/` : `db-integrity.json` ✅,
`logs-audit.json` ✅, `workflow-chain.json` ✅, `RC1-REPORT.md`. Le
workflow complet (checkout → SebPay → provisioning IPTV → livraison →
tracking) est couvert par ces artefacts. Sprint 3 n'a pas modifié le
contrat checkout/webhook/provisioning : la baseline reste applicable.

### 3.4 DB & workflows critiques

Baseline RC1 :
- `orders` — 0 doublon `order_ref`, statuts conformes, `amount>0`, `email` non nul.
- `iptv_accounts` — 0 orphelin, 0 duplicata `(username, provider_id)`.
- `automation_runs` — chaque run `completed` a ≥1 step `succeeded`.
- `delivery_logs` — 0 doublon `(order_ref, channel, sent_at)`.
- FK invalides / NULL interdites — 0.

RLS : audit archivé `docs/security/rls-audit.md`. Migrations Sprint 3
(billing lifecycle, backup verification, secret registry) livrées via
`supabase/migrations/*` et déjà appliquées en production. Contraintes
et policies vérifiées à `v1.0.0-security`, aucune modification depuis.

### 3.5 Performances

Baseline RC1 : `docs/releases/v1.0.0-rc1/artifacts/perf.json`. Cibles
Sprint 3 (rappel) : p95 checkout < 800 ms, taux d'erreur < 0,5 %, queue
drain < 30 s. La suite live `tests/quality/load/checkout_100rps.py`
valide ces SLO en environnement staging (nightly), pas dans le sandbox
de build.

## 4. Risques résiduels & limitations connues

1. **Rate limiting edge** (S3-P0-01) — reporté Sprint 4. Fallback ad-hoc par handler.
2. **PR bot rotation secrets** — remplacé par `security_events` + on-call manuel.
3. **Chaos live scenarios** — dry-run en CI PR ; live cadré nightly staging.
4. **Tests live (RC1, chaos, quality)** — non rejouables dans le sandbox
   de certification (pas d'accès `SUPABASE_SERVICE_ROLE_KEY` ni
   `SEBPAY_SECRET_KEY` en clair côté agent). Rejeu manuel requis avant
   le tag final.
5. **Régression `secrets_leak_test`** — bloquante, cf. §5.

## 5. Correctifs requis avant re-certification

**GA-BLOCK-01 — Isoler les modules serveur du bundle client**

Les fichiers suivants sont référencés depuis le graphe d'import client
(vraisemblablement via une chaîne
`component → *.functions.ts → integration-hub` ou similaire), ce qui
fait suivre Vite pour émettre un chunk côté `dist/client/` :

- `src/integrations/supabase/client.server.ts`
- `src/lib/payments.functions.ts` (chaîne d'import à auditer)
- `src/integration-hub/**` (connector MEGAOTT, adaptateur SebPay)
- `src/routes/ncc.iptv.providers.tsx` (chunk client contient MEGAOTT_BEARER_TOKEN)

**Actions** :
1. Vérifier que chaque import `@/integrations/supabase/client.server`
   n'existe qu'à l'intérieur d'un `.handler()` (dynamic `await import`).
2. Renommer les modules serveur-uniquement en `*.server.ts` pour
   déclencher la garde d'import client de TanStack Start.
3. Sortir les constantes de nom de secret (`process.env.MEGAOTT_BEARER_TOKEN`)
   de tout module partagé (les lire uniquement dans les handlers).
4. Ré-exécuter `tests/rc2/secrets_leak_test.py` — attendu : 0 hit.

Une fois `GA-BLOCK-01` résolu, relancer la certification complète pour
obtenir `v1.0.0-GA CERTIFIED` et poser le tag Git.

## 6. Recommandations

- Ajouter `secrets_leak_test.py` en CI **bloquante** sur `main` pour
  détecter la régression immédiatement à l'introduction.
- Ajouter un test Vite plugin custom qui **échoue le build** si un
  fichier `*.server.ts` est importé depuis un chunk client.
- Après tag, lancer le suivi SLO 7 jours consécutifs contre production
  (via `/api/public/hooks/slo-snapshot`).

## 7. Verdict final

```
v1.0.0-GA NOT CERTIFIED
  - blocker : GA-BLOCK-01 (secrets_leak_test — 20 hits)
  - actions : voir §5
  - re-cert : après passage à 0 hit + rejeu live RC1
```

## Rollback global

- Chaque Bloc Sprint 3 reste réversible individuellement.
- Migration cron : voir `docs/releases/sprint-3/bloc-a/CERTIFICATION.md`
  et `docs/releases/sprint-3/bloc-b/CERTIFICATION.md`.

## Artefacts

`docs/releases/v1.0.0-ga/artifacts/` :
- `rc2-secrets-leak.txt` — rapport RC2 secrets leak (20 hits)
- `rc2-headers.txt` — RC2 security headers (dry-run)
- `rc2-no-admin-toplevel.txt` — ✅
- `rc2-admin-role.txt` — ✅

Baseline RC1 conservée : `docs/releases/v1.0.0-rc1/artifacts/`.

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