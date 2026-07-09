## Ajustement

CamerPay n'expose qu'un seul webhook secret partagé pour tous les canaux (Mobile Money / Stripe / PayPal). Pas besoin de nouveaux secrets — je réutilise le `CAMERPAY_WEBHOOK_SECRET` existant pour les 3 endpoints.

Les deux valeurs que tu m'as collées correspondent aux secrets déjà présents côté Nexora :
- `160b09a0…f46c` → `CAMERPAY_WEBHOOK_SECRET` (déjà configuré ✅)
- `454|MKJc…b4fb` → `CAMERPAY_API_KEY` (déjà configuré ✅)

Ne me les recolle pas — ils sont déjà en place. Je n'ai donc **rien à te demander**.

## Changements code

1. **`src/lib/payments-camerpay.server.ts`** — supprimer les helpers `camerpayStripeWebhookSecret()` / `camerpayPaypalWebhookSecret()` ajoutés au tour précédent (inutiles).

2. **`src/routes/api/public/stripe/webhook.ts`** — remplacer l'appel par `camerpayWebhookSecret()` (secret partagé).

3. **`src/routes/api/public/paypal/webhook.ts`** — idem.

4. **`src/routes/api/public/camerpay-selftest.ts`** — le mode `?provider=stripe|paypal` utilise `CAMERPAY_WEBHOOK_SECRET` pour tout.

5. **Sécurité** — noter dans `@security-memory` que les 3 endpoints partagent le même HMAC secret CamerPay (rotation = une seule opération côté dashboard).

## Après build

Les 3 URLs à coller dans le dashboard CamerPay :

```
https://nexora-iptv.com/api/public/camerpay/webhook
https://nexora-iptv.com/api/public/stripe/webhook
https://nexora-iptv.com/api/public/paypal/webhook
```

Puis je lance un test signé end-to-end sur chaque via `/api/public/camerpay-selftest?provider=stripe&ref=NX-CAMTEST1` et `?provider=paypal`.
