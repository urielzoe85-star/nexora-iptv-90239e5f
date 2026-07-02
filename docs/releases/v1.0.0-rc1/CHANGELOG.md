# NEXORA™ ERP — v1.0.0-RC1

_Release Candidate 1 — 2026-07-02_

**Statut certification :** ✅ RC1 CERTIFIED (voir `artifacts/RC1-REPORT.md`).
**Base stable** pour la suite du développement (Sprint 2+).

---

## 1. Fonctionnalités couvertes

### Chemin critique business (end-to-end)
- **Paiement SebPay** : redirection checkout, webhook signé (HMAC), vérification internale, timeouts (8s / 20s), persistance dans `integration_debug_logs`.
- **Automation Engine** : file `automation_queue` persistante avec `idempotency_key` (index unique), RPC `automation_claim_jobs` (`FOR UPDATE SKIP LOCKED`), backoff exponentiel, workflows `payment-confirmed` / `payment-failed`.
- **Provisioning IPTV (MEGAOTT)** : connecteur durci (gateway captures upstream body, `IntegrationError.meta`), gating provider actif requis, création `iptv_accounts` avec `order_id` / `customer_id`.
- **Composition livraison** : action `composeIptvDelivery` — met à jour `orders.metadata.iptv_delivery` (`ready_to_send`) et insère `delivery_logs { channel:'email', status:'prepared' }`.
- **Email delivery** : template `iptv-delivery` idempotent, message custom sans duplication, `sendEmailAuto` déduplicaté.
- **Suivi commande** : `/track` lit l'état réel de livraison (fin du timer 60s factice) via `getOrderByRef`.

### Sécurité
- Chiffrement clé publique pour la file automation (`automation_queue_pubkey`).
- Auth HMAC sur `mark_order_failed` (`mark_order_failed_noauth`).
- Redaction PII (téléphones) dans `orders.metadata` (`order_metadata_phone_leak`).
- Cron email queue rotation vers `email_queue_cron_secret` (Vault) au lieu du Service Role Key.
- Endpoint `/lovable/email/transactional/send` gated par rôle admin.
- `REVOKE EXECUTE` sur `email_queue_dispatch()` / `email_queue_wake()` pour `anon` / `authenticated`.

### SEO / Public
- Metadata unique par route (root + leaves), `noindex` sur admin / utility routes.
- Preload LCP homepage (asset hashé), fonts `display=swap`.
- JSON-LD Article/Product, canonical, sitemap étendu (`/track`, `/blog/best-iptv-2026`).
- Nouvel article : guide comparatif "Best IPTV Subscriptions 2026".

### Test infra (Sprint 1.5 + RC1)
- Suite Playwright/Python `tests/e2e/sprint-1.5/` (happy path + webhook replay).
- Harness certification `tests/rc1/` (3 scénarios + 3 checks + rapport MD/HTML).
- Endpoint test-only `/api/public/automation/emit-test` — triple garde (`ALLOW_E2E_ENDPOINTS=1`, bearer secret, prefix `NXR-E2E-`).

---

## 2. Corrections notables

| Domaine | Correctif |
|---|---|
| Payments | `verifyPaymentInternal` émet à nouveau `payment.confirmed`/`payment.failed` (chaîne payment→IPTV rebranchée). |
| Payments | Webhooks SebPay persistés systématiquement dans `integration_debug_logs`. |
| Automation | Idempotence stricte : `idempotency_key` + unique index sur `automation_queue`. |
| Automation | Concurrence : `automation_claim_jobs` (`SKIP LOCKED`) — plus de double-consommation. |
| Automation | Retries : backoff exponentiel sur `process-queue`. |
| MEGAOTT | `mapStatus` : statut manquant ne bascule plus en `expired` par défaut. |
| MEGAOTT | `isReady()` renforcé — requiert au moins un provider `active` en DB (sinon simulé). |
| Delivery | `IptvDeliveryCard` remplace `MegaottDeliveryForm` (saisie manuelle credentials). |
| Delivery | `sendEmailAuto` idempotent. |
| Track | `track.tsx` lit `iptv_delivery.delivery_status` réel (fin du timer 60s). |
| Checkout | Liens `/checkout` : ajout des search params requis (dashboard, payment.failed, track). |
| SEO | Preload LCP corrigé (URL hashée vs source path). |
| Security | Voir §Sécurité ci-dessus. |

---

## 3. Modules certifiés (RC1)

| Module | Statut | Preuve |
|---|---|---|
| Payment SebPay (webhook + verify) | ✅ | `scenario_01.json`, `logs-audit.json` |
| Automation Engine (queue, claim, retry) | ✅ | `scenario_01.json`, `scenario_02.json` |
| Idempotence webhook (replay HMAC) | ✅ | `scenario_02.json` |
| MEGAOTT provisioning (mode réel + fallback simulé) | ✅ | `scenario_01.json`, `scenario_03.json` |
| Composition livraison + `delivery_logs` | ✅ | `scenario_01.json` |
| Intégrité DB (statuts, FK, PII) | ✅ | `db-integrity.json` (0 critique, 0 warning) |
| Chaîne temporelle workflow | ✅ | `workflow-chain.json` (ok=True) |
| Logs audit (secrets, PII, erreurs) | ✅ | `logs-audit.json` (0 critique, 0 warning) |

---

## 4. Limitations connues

- **MEGAOTT sandbox** : aucun sandbox officiel côté fournisseur. Le scénario RC1-03 valide le fallback simulé ; un run réel unique est décrit dans `tests/e2e/sprint-1.5/03-real-megaott.md` (manuel).
- **Provisioning auto multi-provider** : le workflow ne bascule pas encore automatiquement vers un provider secondaire si MEGAOTT est disponible mais retourne une erreur métier (503/upstream). Prévu Sprint 3.
- **Billing récurrent** : hors périmètre v1 (paiement one-shot uniquement).
- **Backups DB** : dépend de la plateforme Cloud (pas de politique custom encore).
- **Tests unitaires** : couverture modeste (~focus E2E). Sprint 2 ajoutera la couverture RLS.
- **Rate limiting** : reposant sur la plateforme, pas de bucket applicatif fin. À durcir Sprint 2.
- **Internationalisation** : FR/EN uniquement, pas de RTL.

---

## 5. Artefacts de certification

Voir `docs/releases/v1.0.0-rc1/artifacts/` :

- `RC1-REPORT.md` — rapport officiel Markdown
- `RC1-playwright-report.html` — rapport HTML navigable
- `scenario_01.json` — Full journey (payment → IPTV → delivery)
- `scenario_02.json` — Webhook replay / idempotence HMAC
- `scenario_03.json` — Provider fallback (MEGAOTT off)
- `db-integrity.json` — audit schéma + statuts + PII
- `workflow-chain.json` — chaîne temporelle des runs
- `logs-audit.json` — audit logs (secrets, PII, erreurs)
- `perf.json`, `perf_01.json` — mesures de perf par étape

---

## 6. Tag

`v1.0.0-rc1` — base stable, point de départ Sprint 2 (Sécurité / RLS / Hardening).