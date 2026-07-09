## Objectif

Créer 3 endpoints webhook Nexora signés à déclarer dans le dashboard CamerPay :

- `https://nexora-iptv.com/api/public/camerpay/webhook` *(existe déjà)*
- `https://nexora-iptv.com/api/public/stripe/webhook` *(à créer)*
- `https://nexora-iptv.com/api/public/paypal/webhook` *(à créer)*

Note : les URLs `camerpay.biz/webhook/*` que tu m'as données sont côté CamerPay — pas utilisables comme destination. Je vais te fournir les 3 URLs Nexora ci-dessus, à coller dans le dashboard CamerPay.

## Étapes

1. **Secrets partagés** (via `add_secret`, tu génères une valeur random et tu la colles à la fois côté CamerPay dashboard et côté Nexora) :
   - `CAMERPAY_STRIPE_WEBHOOK_SECRET`
   - `CAMERPAY_PAYPAL_WEBHOOK_SECRET`
   - (le `CAMERPAY_WEBHOOK_SECRET` existant reste inchangé)

2. **Nouveau helper** `src/lib/payments-camerpay.server.ts` : factoriser une fonction `verifyHmacSignature(rawBody, header, secret)` réutilisable + mapping payload → mise à jour `orders`.

3. **Route** `src/routes/api/public/stripe/webhook.ts` :
   - `POST` uniquement, lecture `request.text()` (raw body indispensable pour HMAC)
   - vérification HMAC SHA-256 header `x-camerpay-signature` avec `CAMERPAY_STRIPE_WEBHOOK_SECRET`, comparaison `timingSafeEqual`
   - validation Zod du payload (`order_ref`, `status`, `transaction_id`, `amount`, `currency`, `provider: "stripe"`)
   - mise à jour `orders` via `supabaseAdmin` (import dynamique dans le handler) + insert `payment_events`
   - idempotence sur `transaction_id`
   - jamais de PII renvoyée, réponse `200 { ok: true }` ou `401/400` sans détails

4. **Route** `src/routes/api/public/paypal/webhook.ts` : mêmes règles, secret `CAMERPAY_PAYPAL_WEBHOOK_SECRET`, `provider: "paypal"`.

5. **Régénérer** `src/routeTree.gen.ts` (auto via plugin au build).

6. **Auto-test signé** : étendre `camerpay-selftest.ts` avec deux nouveaux modes `?provider=stripe` et `?provider=paypal` pour vérifier chaque endpoint end-to-end après déploiement.

7. **Publish** puis vérification live des 3 endpoints via curl signé.

## Sécurité

- Pas de `supabaseAdmin` en import top-level dans les route files.
- Signature vérifiée avant tout `JSON.parse`.
- Rate-limiting implicite via `orders.status` idempotent.
- Aucun log de PII (email, phone, address).
- Update `@security-memory` : ajouter les 2 nouveaux endpoints à la "surface publique acceptée".

## Livrable pour toi

Après implémentation, tu recevras un bloc prêt-à-coller pour le dashboard CamerPay avec les 3 URLs et l'algo de signature attendu (`HMAC-SHA256 hex, header x-camerpay-signature, body = raw JSON`).
