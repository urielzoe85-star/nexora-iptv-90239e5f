# Billing Lifecycle — NEXORA ERP

_Version : Sprint 3 · Bloc A_

Ce document décrit **le cycle de vie complet** d'un abonnement IPTV Nexora, du
moment où le paiement est confirmé jusqu'à la suspension ou la réactivation.
Toute divergence entre le code et ce document doit être traitée comme un bug.

## 1. Machine à états

```
                 ┌─────────┐
                 │ ACTIVE  │◀──────────────────────┐
                 └────┬────┘                       │
          expires_at  │  ≤ 7 jours                 │
                     ▼                             │
              ┌──────────────┐                     │
              │ EXPIRING_SOON│  ← rappel J-7/J-3/J-1
              └──────┬───────┘                     │
          expires_at │  atteint                    │
                     ▼                             │
                 ┌──────────┐                      │
                 │ EXPIRED  │                      │
                 └────┬─────┘                      │
          paiement    │  échoué / absent           │
                     ▼                             │
              ┌────────────────┐                   │
              │ PAYMENT_PENDING│ ← dunning J+1/J+3 │
              └───────┬────────┘                   │
                J+7   │                            │
                     ▼                             │
                ┌────────────┐                     │
                │ SUSPENDED  │                     │
                └─────┬──────┘                     │
           paiement   │  confirmé                  │
                     ▼                             │
                 ┌──────────┐                      │
                 │ RENEWED  │──────────────────────┘
                 └──────────┘
```

**Table des statuts persistés** (`public.iptv_accounts.status`, enum
`iptv_account_status`) : `active`, `expired`, `suspended`, `disabled` +
valeurs opérationnelles (`available`, `assigned`, `reserved`, `delivered`).
`expiring_soon`, `payment_pending`, `renewed` sont **logiques** — ils
n'existent que dans le journal `public.iptv_lifecycle_events` (colonne
`to_state`).

## 2. Événements d'audit

Chaque transition insère une ligne dans `public.iptv_lifecycle_events` :

| Colonne       | Contenu                                          |
| ------------- | ------------------------------------------------ |
| `account_id`  | UUID de l'abonnement                             |
| `from_state`  | Statut avant                                     |
| `to_state`    | Statut après (peut être logique — voir §1)       |
| `reason`      | `reminder_j7`, `reminder_j3`, `reminder_j1`, `dunning_j7_auto_suspend`, `reactivation`, … |
| `actor`       | `system` \| `webhook` \| `cron` \| `admin`       |
| `metadata`    | JSON (order_id, expires_at, milestone, …)        |

**RLS** : lecture réservée aux administrateurs (`has_role(auth.uid(),'admin')`).
Les crons/webhooks écrivent via `service_role` (helper `recordLifecycleEvent`
dans `src/lib/billing.server.ts`).

## 3. Idempotence

| Table                          | Clé unique                                | Utilisée par                                   |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| `renewal_reminders_sent`       | `(account_id, milestone_days, expires_at)`| Cron `/api/public/hooks/renewal-reminders`     |
| `payment_dunning_sent`         | `(order_id, milestone_days, failed_at)`   | Cron `/api/public/hooks/payment-dunning`       |
| `automation_queue.idempotency` | `idempotency_key` (`event:orderRef`)       | Workflows `payment.confirmed` / `payment.failed` |

Un client **ne peut pas** recevoir deux rappels pour la même échéance. Une
relance J+3 ne peut pas être envoyée deux fois pour le même paiement échoué.
L'inclusion de `expires_at` / `failed_at` dans la clé permet un nouveau cycle
après renouvellement.

## 4. Rappels de renouvellement (J-7 / J-3 / J-1)

- Endpoint : `POST /api/public/hooks/renewal-reminders`
- Auth : `Authorization: Bearer $AUTOMATION_CRON_SECRET`
- Cadence : cron quotidien (recommandé : 09:00 UTC)
- Rate-limit local : 6 appels / 10 min / IP
- Template : `iptv-renewal-reminder` (i18n `fr` / `en` via `data.locale`)
- Audit : insertion `iptv_lifecycle_events (to_state='expiring_soon')`

## 5. Relances de paiement (J+1 / J+3 / J+7)

- Endpoint : `POST /api/public/hooks/payment-dunning`
- Auth : idem cron
- Rate-limit local : 6 / 10 min / IP
- Template : `payment-failed`
- **À J+7** : chaque `iptv_accounts.order_id = orders.id` est passé en
  `status='suspended'`, `enabled=false`, `admin_enabled=false`, audité via
  `iptv_lifecycle_events (to_state='suspended', reason='dunning_j7_auto_suspend')`.

## 6. Réactivation automatique

Déclenchée depuis `verifyPaymentInternal` dans `src/lib/payments.functions.ts`
dès qu'un paiement passe à `paid` (webhook SebPay ou polling success page).
Le helper `reactivateAccountsForOrder` remet chaque compte suspendu en
`status='active'`, `enabled=true`, `admin_enabled=true`, avec audit
`to_state='active', reason='reactivation', actor='webhook'`.

## 7. Observabilité

Vue agrégée : `public.billing_metrics_daily` (rolling 30 jours).

| Colonne          | Signification                                                 |
| ---------------- | ------------------------------------------------------------- |
| `reminders_sent` | Rappels J-7/J-3/J-1 envoyés ce jour                           |
| `dunning_sent`   | Relances J+1/J+3/J+7 envoyées ce jour                         |
| `suspensions`    | Suspensions automatiques ce jour                              |
| `reactivations`  | Réactivations automatiques ce jour                            |

**Rappels ignorés** / **échecs d'envoi** : traçables via les logs Worker
(`[renewal-reminders]`, `[payment-dunning]`) + la table `email_send_log`
(`status IN ('failed','bounced','complained','dropped')`).

**Temps moyen de traitement** : dérivé de la latence Vite/CF sur les endpoints
cron (visible dans les logs standards).

## 8. Rate-limiting local

Implémentation : `src/lib/rate-limit.server.ts` — fenêtre glissante
**par instance Worker**, en mémoire, remplaçable par un back-end centralisé
(Redis/Upstash/DO). Documenté et non-bloquant pour GA (cf. `docs/sprints/sprint-3-plan.md`).

| Endpoint                              | Limite                |
| ------------------------------------- | --------------------- |
| `/api/public/sebpay/webhook`          | 60 / 60 s / IP        |
| `/api/public/hooks/renewal-reminders` | 6 / 10 min / IP       |
| `/api/public/hooks/payment-dunning`   | 6 / 10 min / IP       |
| `/api/public/automation/emit-test`    | 30 / 60 s / IP (test) |

## 9. Tests E2E

Suite : `tests/e2e/sprint-3/billing_lifecycle_test.py` — couvre rappels
J-7/J-3/J-1, paiement avant / après expiration, suspension automatique,
réactivation, absence de doublons, idempotence complète.

## 10. Points ouverts

- Rate-limit local remplacé par une primitive centralisée (post-GA).
- `expiring_soon` / `payment_pending` / `renewed` : rester logiques ou
  ajouter des valeurs à l'enum `iptv_account_status` (nécessite migration
  + refactor UI, non-bloquant GA).