# Certification RC1 — Plan

Objectif : produire une certification reproductible qui atteste, ou refuse, que la version courante est **RC1 CERTIFIED – READY FOR PRODUCTION**. Tout est scripté sous `tests/rc1/` pour rejouer la certification à volonté.

## Livrables

1. Suite E2E RC1 (Playwright + Python) sous `tests/rc1/`.
2. Rapport HTML Playwright (`tests/rc1/report/index.html`) : screenshots, logs, durées, étapes.
3. Rapport DB `tests/rc1/out/db-integrity.json` + section markdown.
4. Rapport logs `tests/rc1/out/logs-check.json`.
5. Rapport perf `tests/rc1/out/perf.json` (chrono par étape + total).
6. **Rapport final** `tests/rc1/out/RC1-REPORT.md` avec verdict `RC1 CERTIFIED` / `RC1 NOT CERTIFIED`.

## Structure

```text
tests/rc1/
  README.md
  run-certification.sh         # orchestrateur unique
  playwright.config.ts         # reporter=html, screenshots on, trace on
  package.json                 # @playwright/test seulement (workspace isolé)
  scenarios/
    01-checkout-to-track.spec.ts     # parcours complet UI + assertions
    02-idempotence.spec.ts           # double webhook, 1 seul compte
    03-provider-fallback.spec.ts     # MEGAOTT off → adapter simulé
  checks/
    db-integrity.py            # orphelins, doublons, FK, états
    workflow-chain.py          # chaîne Checkout→…→Track par ref
    logs-audit.py              # scan iptv_logs + automation_steps + runs
    perf-collector.py          # agrège perf.json depuis Playwright
    build-report.py            # assemble RC1-REPORT.md + verdict
  helpers/                     # réutilise tests/e2e/sprint-1.5/helpers/
```

## Contenu des vérifications

### DB (`db-integrity.py`)
Table par table :

- `orders` — pas de doublon `order_ref`, `status` ∈ enum, `amount>0`, `email` non nul.
- `iptv_accounts` — `metadata->>order_ref` référence un `orders.order_ref` existant (orphelins), pas de duplicata `(username, provider_id)`.
- `automation_runs` — chaque run `completed` a ≥1 step `succeeded`, aucun step `failed` non retenté, `payload->>orderRef` référence un order.
- `delivery_logs` — `order_ref` existe dans `orders`, `channel` connu, pas de doublon `(order_ref, channel, sent_at)`.
- `notifications` — FK `customer_id` valide quand renseignée.
- `customer_events` — `order_ref` valide quand renseigné.
- FK invalides / colonnes NULL interdites signalées.

Note : `payments` et `audit_logs` ne sont pas des tables du projet. On les mappe explicitement : `payments` → `orders` (colonnes `sebpay_reference`, `method`, `amount`, `currency`) ; `audit_logs` → `iptv_logs` + `automation_steps` + `integration_debug_logs`. C'est écrit noir sur blanc dans le rapport.

### Chaîne de workflow (`workflow-chain.py`)
Pour chaque `order_ref` de test, vérifie l'ordre chronologique :
`orders.created_at` < `automation_runs(payment-confirmed).started_at` < `automation_runs.completed_at` < `iptv_accounts.created_at` < `delivery_logs.sent_at`, et que `/track?ref=…` répond 200 avec le ref affiché.

### Logs (`logs-audit.py`)
Scanne `iptv_logs`, `automation_steps`, `integration_debug_logs`, `automation_queue`, `automation_runs` sur la fenêtre du run pour détecter :
`level=error`, `status=failed`, exceptions, `promise rejection`, warnings marqués bloquants, jobs `dead_letter`. Retourne 0 anomalie ou la liste précise.

### Performances (`perf-collector.py`)
Chaque scénario Playwright émet un `perf-<ref>.json` avec les timers :
`t_checkout`, `t_payment`, `t_workflow`, `t_delivery`, `t_tracking`, `t_total`. Agrégés en médiane + p95.

## Rapport final `RC1-REPORT.md`

Sections : tests exécutés / réussis / échoués, modules couverts (checkout, paiement, workflow, IPTV, delivery, tracking, notifications), couverture fonctionnelle (checklist des scénarios), tableau des perfs, tableau des anomalies DB/logs, verdict final.

Verdict = `RC1 CERTIFIED – READY FOR PRODUCTION` si et seulement si :
- tous les scénarios Playwright pass,
- 0 anomalie DB critique,
- 0 anomalie logs critique,
- chaîne de workflow OK pour chaque ref,
- perf totale médiane < seuil configurable (défaut 30 s).

Sinon `RC1 NOT CERTIFIED` avec la liste précise des blocages.

## Exécution

```bash
bash tests/rc1/run-certification.sh
# → tests/rc1/report/index.html  (Playwright)
# → tests/rc1/out/RC1-REPORT.md   (verdict)
```

Le script : (1) installe `@playwright/test` local à `tests/rc1/`, (2) lance Playwright avec `--reporter=html`, (3) chaîne les 4 checks Python, (4) construit le rapport final, (5) sort en code ≠ 0 si `NOT CERTIFIED` pour bloquer un pipeline CI.

## Détails techniques

- Aucun changement du code applicatif (`src/**`) — la certification est purement additive.
- Réutilise `tests/e2e/sprint-1.5/helpers/{db,http,cleanup}.py` déjà validés.
- Toutes les données de test créées avec préfixe `NXR-RC1-<ts>` et nettoyées en `finally`.
- `run-certification.sh` détecte l'absence de `SUPABASE_SERVICE_ROLE_KEY` et l'annonce clairement (obligatoire).
- Aucune modification de schéma DB. Aucun tag Git côté agent (le tag reste une action humaine explicite).

## Hors périmètre (Sprint 2)

Durcissement sécurité, IA, ERP, SaaS — non touchés ici.
