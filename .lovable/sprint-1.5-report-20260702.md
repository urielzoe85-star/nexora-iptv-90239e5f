# Sprint 1.5 + RC1 — Rapport d'exécution E2E

## Contexte

- Date : 2026-07-02
- Base URL testée : `http://localhost:8080`
- Commit : `fefce654b12fa7ba8fe968e38e3b59fb33279ea8`
- Testeur : Agent Lovable (exécution sandbox)
- Orchestrateur : `bash tests/rc1/run-certification.sh`
- Artefacts :
  - Rapport HTML : `tests/rc1/report/index.html`
  - Rapport Markdown : `tests/rc1/out/RC1-REPORT.md`
  - Scénarios JSON : `tests/rc1/out/scenario_0{1,2,3}.json`
  - DB / logs / chain : `tests/rc1/out/{db-integrity,logs-audit,workflow-chain}.json`
  - Perf agrégées : `tests/rc1/out/perf.json`

## Scénario 1 — Happy path (RC1-01)

- [x] `scenarios/01_full_journey.py` exécuté
- [ ] `scenario_01.json` : `ok = false`
- [ ] Screenshots `/track` : aucun capturé (échec avant l'étape tracking)

Extraits :
- `orders_rc1` créés : `0`
- `iptv_accounts` créé pour le ref : 0 (attendu : 1)
- `automation_runs.completed` pour le ref : 0
- `delivery_logs` : 0
- Erreur : `AssertionError: expected 1 iptv_account, got 0`
- Étapes OK : `checkout_seed` (245 ms), `payment_emit` HTTP 200 (285 ms), `workflow_drain` 2 itérations (1 257 ms)
- Étapes bloquantes : `iptv_assignment`, `delivery`, `tracking`

## Scénario 2 — Webhook rejoué (RC1-02)

- [x] `scenarios/02_webhook_replay.py` exécuté
- [x] `scenario_02.json` : `ok = true`
- [x] `webhook_valid_1` HTTP 200, `webhook_valid_2_replay` HTTP 200 (idempotent), `webhook_invalid_sig` HTTP 401
- [x] `receipts_recorded.valid_count = 2`, aucun `iptv_account` dupliqué sur le replay
- Durée totale : 1 068 ms

## Scénario 3 — Provider fallback MEGAOTT off (RC1-03)

- [x] `scenarios/03_provider_fallback.py` exécuté
- [ ] `scenario_03.json` : `ok = false`
- Étape `disable_megaott` : 0 provider mis à jour (aucune ligne `iptv_providers.code = 'megaott'` active)
- Erreur : `AssertionError: expected 1 iptv_account under fallback, got 0`
- Cause probable : provider MEGAOTT absent → pas de primaire à désactiver.

## Récapitulatif performances

| Étape         | Médiane (ms) | p95 (ms) | Max (ms) | Échantillons |
|---------------|--------------|----------|----------|--------------|
| t_checkout    | 245          | 245      | 245      | 1            |
| t_payment     | 285          | 285      | 285      | 1            |
| t_workflow    | 1 257        | 1 257    | 1 257    | 1            |
| t_delivery    | —            | —        | —        | 0            |
| t_tracking    | —            | —        | —        | 0            |
| t_total       | 9 162        | 1 068    | 17 257   | 2            |

Budget cible (t_total, médiane) : 30 000 ms — respecté sur les scénarios ayant abouti.

## Intégrité DB

- Anomalies critiques : 0
- Warnings : 0
- Stats : `orders_rc1=0`, `iptv_accounts_total=20`, `automation_runs_rc1=0`, `automation_steps_rc1=0`, `delivery_logs_total=0`, `notifications_total=10`, `customer_events_total=3`
- Mapping : `payments → orders` (`sebpay_reference`, `method`, `amount`, `currency`), `audit_logs → iptv_logs + automation_steps + integration_debug_logs`

## Logs

- Anomalies critiques : 0
- Warnings : 0
- Sources scannées : `iptv_logs`, `automation_steps`, `automation_runs`, `automation_queue`, `integration_debug_logs`

## Chaîne de workflow

- Refs vérifiés : 1 (RC1-02) — OK : 0
- Sur le ref replay, `order_created_at`, `run_completed_at`, `account_created_at`, `delivery_sent_at` absents (webhook signé sans ordre préalable — conforme, mais confirme qu'aucun parcours end-to-end n'a été validé cette exécution).

## Anomalies rencontrées

1. Bloquant — RC1-01 : ni `automation_runs` persistés ni `iptv_accounts` malgré `payment_emit` 200 + drain queue. Aucun log critique (à investiguer côté handler `automation:payment.confirmed` en sandbox).
2. Bloquant — RC1-03 : aucun `iptv_providers.code='megaott'` dans l'environnement → fallback non simulable.
3. Mineur — `helpers/cleanup.py` cible des colonnes inexistantes (`delivery_logs.order_ref`, `customer_events.order_ref`, `automation_steps.payload`). Cleanup skippé sans faire échouer les scénarios.

## Verdict RC1

> ❌ RC1 NOT CERTIFIED

Blocages retenus par `checks/build_report.py` :
- `2 scenario(s) failed: RC1-01, RC1-03`
- `Workflow chain broken for: NXR-E2E-RC1-1782995223-wh`

## Décision Release

- [ ] GO Sprint 2 (sécurité / RLS)
- [x] NO-GO — anomalies bloquantes à corriger avant tag Git + sauvegarde :
  1. Rendre RC1-01 exécutable en sandbox (provider MEGAOTT de test + secrets, ou adapter stub par défaut).
  2. Corriger `helpers/cleanup.py` (colonnes réelles).
  3. Rejouer `bash tests/rc1/run-certification.sh` jusqu'à `RC1 CERTIFIED – READY FOR PRODUCTION`.

Une fois ces points levés et le verdict au vert, la version pourra être figée (tag Git + sauvegarde) avant l'ouverture du Sprint 2.
