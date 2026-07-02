# RC1 Certification Report

- **Date**: 2026-07-02T17:11:26.835395+00:00
- **Base URL**: http://localhost:8080
- **Perf budget (t_total, median)**: 30000 ms

## Verdict

## ✅ RC1 CERTIFIED – READY FOR PRODUCTION

## Tests

- Total: **3**  ·  Passed: **3**  ·  Failed: **0**

| ID | Nom | Résultat | Ref | Erreur |
|----|-----|----------|-----|--------|
| RC1-01 | Full journey — Checkout → Payment → Workflow → IPTV → Delivery → Track | ✅ PASS | `NXR-E2E-RC1-1783012270` |  |
| RC1-02 | Webhook replay + invalid signature | ✅ PASS | `NXR-E2E-RC1-1783012277-wh` |  |
| RC1-03 | Provider fallback (MEGAOTT off) | ✅ PASS | `NXR-E2E-RC1-1783012279-fb` |  |

## Modules couverts

`checkout`, `payment`, `workflow`, `iptv`, `delivery`, `tracking`, `notifications`

## Couverture fonctionnelle

- Checkout → seed d'ordre + validation status (RC1-01)
- Payment → emit-test + webhook SebPay signé (RC1-01, RC1-02)
- Workflow → drain queue + steps (RC1-01, RC1-03)
- IPTV assignment → 1 compte / order, fallback si MEGAOTT off (RC1-01, RC1-03)
- Delivery → delivery_logs + orders.metadata.iptv_delivery (RC1-01)
- Tracking → /track?ref=... 200 + ref affiché (RC1-01, workflow-chain)
- Idempotence / sécurité HMAC → replay + signature invalide (RC1-02)

## Performances

| Étape | Médiane (ms) | p95 (ms) | Max (ms) | Échantillons |
|-------|--------------|----------|----------|--------------|
| t_checkout | 214 | 214 | 214 | 1 |
| t_payment | 276 | 276 | 276 | 1 |
| t_workflow | 1759 | 1759 | 1759 | 1 |
| t_delivery | 215 | 215 | 215 | 1 |
| t_tracking | 2033 | 2033 | 2033 | 1 |
| t_total | 1924 | 1924 | 6548 | 3 |

## Intégrité DB

- Critical: **0**  ·  Warnings: **0**
- Stats: `{"orders_rc1": 3, "iptv_accounts_total": 22, "automation_runs_rc1": 2, "automation_steps_rc1": 14, "delivery_logs_total": 2, "notifications_total": 10, "customer_events_total": 3}`
- Mapping demandé → réel: `payments`→`orders`, `audit_logs`→`iptv_logs+automation_steps+integration_debug_logs`

## Logs

- Critical: **0**  ·  Warnings: **0**

## Chaîne de workflow

- Refs vérifiés: **1**  ·  OK: **1**
- ✅ `NXR-E2E-RC1-1783012270` — chain_ok=True track_ok=True(HTTP 200) missing=[]

## Prochaine étape

Figer RC1 : tag Git + sauvegarde, puis ouvrir Sprint 2 (sécurité, durcissement).
