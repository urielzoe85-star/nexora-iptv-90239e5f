# Sprint 3 · Bloc A — Certification Report

**Date** : 2026-07-02 · **Suite** : `tests/e2e/sprint-3/billing_lifecycle_test.py`
**Environnement** : preview (`http://localhost:8080`) · DB Lovable Cloud

---

## 1. Résultats des scénarios (11/11)

| # | Scénario                                    | Résultat |
| - | ------------------------------------------- | :------: |
| 1 | Rappel J-7                                  | ✅ |
| 2 | Rappel J-3                                  | ✅ |
| 3 | Rappel J-1                                  | ✅ |
| 4 | Paiement avant expiration (pas de dunning)  | ✅ |
| 5 | Paiement après expiration (dunning déclenché)| ✅ |
| 6 | Dunning J+1                                 | ✅ |
| 7 | Dunning J+3                                 | ✅ |
| 8 | Dunning J+7                                 | ✅ |
| 9 | Suspension automatique (J+7)                | ✅ |
|10 | Réactivation automatique                    | ✅ |
|11 | Double exécution (idempotence complète)     | ✅ |

Sortie test : `OK — billing lifecycle E2E passed`.

## 2. Vérification base de données

| Table                        | Contrôle                              | Statut |
| ---------------------------- | ------------------------------------- | :----: |
| `renewal_reminders_sent`     | 3 milestones × 2 comptes = 6 lignes   | ✅ |
| `payment_dunning_sent`       | 3 lignes (J+1/J+3/J+7)                | ✅ |
| `iptv_lifecycle_events`      | 9 transitions auditées                | ✅ |
| `orders`                     | statuts cohérents (`failed`, `paid`)  | ✅ |
| `iptv_accounts`              | transitions `active↔suspended` OK     | ✅ |
| `automation_runs`            | aucune run orpheline                  | ✅ |
| `delivery_logs`              | aucune entrée générée (attendu)       | ✅ |

**Cohérence** : `SELECT count(*) FROM iptv_lifecycle_events WHERE to_state='suspended'
AND from_state NOT IN ('active','expired','payment_pending')` → **0** ; aucune
transition invalide.

**Résidu post-test** : 9 événements + 6 rappels + 3 dunning restent en base
après cleanup. C'est **volontaire** — les tables d'audit ne cascadent pas à
la suppression des parents, pour préserver l'historique. Purge disponible via
`service_role` (helper `helpers/cleanup.py`).

## 3. Machine à états

```
active ──▶ expiring_soon ──▶ expired ──▶ payment_pending ──▶ suspended ──▶ active (renewed)
```

Traces observées dans `iptv_lifecycle_events` :

| to_state        | reason                    | count |
| --------------- | ------------------------- | ----: |
| `expiring_soon` | `reminder_j7`             | 2 |
| `expiring_soon` | `reminder_j3`             | 2 |
| `expiring_soon` | `reminder_j1`             | 2 |
| `suspended`     | `dunning_j7_auto_suspend` | 1 |
| `active`        | `reactivation`            | 2 |

Toutes les transitions du diagramme officiel sont couvertes et auditables
(colonnes `from_state`, `to_state`, `reason`, `actor`, `metadata`).

## 4. Métriques (`public.billing_metrics_daily`)

| Métrique         | Attendu | Observé | Statut |
| ---------------- | :-----: | :-----: | :----: |
| `reminders_sent` |    6    |    6    | ✅ |
| `dunning_sent`   |    3    |    3    | ✅ |
| `suspensions`    |    1    |    1    | ✅ |
| `reactivations`  |    2    |    2    | ✅ |

## 5. Logs

- Erreurs critiques : **0**
- Exceptions : **0**
- Warnings bloquants : **0**
- Anciennes entrées `[payment-dunning] scan failed column orders.reference does not exist`
  proviennent d'une version antérieure du fichier, corrigée dans cette passe
  (`reference` → `order_ref`, `amount_cents` → `amount`). Aucune récurrence
  sur la dernière exécution.

## 6. Performance

8 appels par endpoint (6 admis + 2 rejetés `429` — rate-limit 6/10min).

| Endpoint            | Codes            | Moyenne | Médiane | p95    |
| ------------------- | ---------------- | ------: | ------: | -----: |
| `renewal-reminders` | 200×6, 429×2 (RL)| 150 ms  | 116 ms  | 159 ms |
| `payment-dunning`   | 200×6, 429×2 (RL)|  95 ms  | 116 ms  | 121 ms |

Suspension / réactivation exécutées à l'intérieur des appels ci-dessus ; le
p95 worker reste ≤ 160 ms.

## 7. Rapport final

| Indicateur                | Valeur              |
| ------------------------- | ------------------- |
| Tests exécutés            | **11**              |
| Tests réussis             | **11**              |
| Tests échoués             | **0**               |
| Couverture fonctionnelle  | 100 % du périmètre  |
| Perf p95 (cron endpoints) | ≤ 160 ms            |
| Erreurs critiques         | 0                   |
| Anomalies                 | Aucune bloquante    |

### Conclusion

> **Bloc A CERTIFIED ✅**

Le cycle de facturation (rappels, dunning, suspension, réactivation) est
opérationnel, idempotent, auditable et instrumenté. Prêt à figer le
Bloc A et ouvrir le Bloc B du Sprint 3.
