## Objectif

Vérifier end-to-end que les 4 canaux de paiement se déclenchent automatiquement selon la méthode/pays choisi, sans intervention manuelle.

## Matrice à valider

| Méthode client | Pays | Provider attendu | Canal CamerPay | Flow attendu |
|---|---|---|---|---|
| MoMo | CM | CamerPay | `mobile_money` | redirect hosted page |
| MoMo | CI/SN/... | SebPay | — | redirect SebPay |
| Carte | any | CamerPay | `stripe` | redirect hosted page |
| PayPal | any | CamerPay | `paypal` | redirect hosted page |
| Binance | any | manual | — | QR + preuve (inchangé) |

## Étapes de vérification

1. **Audit code (lecture seule)**
   - Relire `src/lib/orders.functions.ts` : conversion USD→XAF appliquée pour `card`/`paypal`, `metadata.card.channel` bien posé.
   - Relire `src/lib/payments.functions.ts` : `initCheckout` force `camerpay` pour `card`/`paypal` ; `initCamerPayCheckout` mappe `channel` → `stripe`/`paypal`/`mobile_money` correctement ; routage MoMo par pays intact.
   - Relire `src/routes/checkout.tsx` : les tuiles Carte/PayPal appellent bien `initCheckout` puis `initCamerPayCheckout` et redirigent sur `providerLink`.
   - Vérifier `src/routes/espace-client.pay.$ref.tsx` : gère aussi `method === "card"` / `"paypal"` (sinon un client qui revient sur la page de paiement voit un écran vide).

2. **Test runtime signé sur les 3 webhooks** (via `camerpay-selftest` déjà en place)
   - `curl` sur `/api/public/camerpay-selftest?provider=camerpay|stripe|paypal&ref=NX-VERIF-<ts>&status=completed` — attendu `200 {ok:true, status:"paid"}` sur les 3.
   - `curl` SebPay : réutiliser `tests/e2e/sprint-3/billing_lifecycle_test.py` ou un ping signé sur `/api/public/sebpay/webhook`.

3. **Test création d'ordre + init checkout** (server functions)
   - Créer 4 ordres via `createOrder` avec `method` = `momo`(CM), `momo`(CI), `card`, `paypal`.
   - Appeler `initCheckout` sur chacun, vérifier `provider` retourné et présence de `providerLink`.
   - Vérifier en base : `orders.payment_provider`, `metadata.card.channel`, `amount`/`currency` (XAF pour CamerPay).

4. **Rapport**
   - Tableau récap avec statut ✅/❌ par canal, référence de test, provider effectivement invoqué.
   - Si un cas échoue : correctif ciblé (probablement `espace-client.pay.$ref.tsx` pour les nouvelles méthodes).

## Détails techniques

- Aucune modif fonctionnelle prévue en dehors d'un éventuel patch sur la page `/espace-client/pay/$ref` si elle ne gère pas encore `card`/`paypal` (aujourd'hui elle ne connaît que `momo` et `crypto`).
- Pas de changement DB, pas de nouvelle migration.
- Les tests utilisent uniquement l'endpoint self-test déjà déployé + server functions existantes.
