# Fix : paiements CamerPay qui n'aboutissent pas

## Diagnostic (confirmé)

Les logs serveur montrent que **l'API CamerPay renvoie `HTTP 520` (Cloudflare "origin unreachable")** sur chaque tentative des 2 derniers jours :

```
[camerpay] initiate failed {"status":520,"detail":"error code: 520\n"}
```

- Toutes les commandes récentes (`NX-ZVKMNDDGUQ`, `NX-S98CQYD83S`, …) restent en `pending`, `payment_provider = null`, aucune réponse CamerPay enregistrée.
- Tu reçois quand même la notification Telegram/WhatsApp/email parce qu'elle est déclenchée à la **création de la commande** (workflow `order-created`), *avant* l'appel à CamerPay.
- Le client, lui, voit "Le paiement CamerPay n'a pas pu être initialisé" et ne peut pas payer.

C'est un incident côté CamerPay (leur origine derrière Cloudflare est down/instable), pas un bug de code. Mais on peut rendre le checkout beaucoup plus résilient.

## Ce que je vais faire

### 1. Retry automatique sur 5xx / timeout côté serveur
Dans `src/lib/payments-camerpay.server.ts` (fonction `camerpayFetch` + `camerpayInitiate`) :
- 3 tentatives max, backoff 400 ms → 1200 ms → 2500 ms.
- On ne retry **que** sur `status >= 500`, `429`, ou `AbortError` (timeout).
- On ne retry **jamais** sur 4xx (mauvaise requête / clé invalide) pour éviter de générer des doublons.
- L'`idempotency_key = order_ref` est déjà envoyé, donc les retries sont sûrs côté CamerPay.

### 2. Message d'erreur client plus clair
Aujourd'hui : "Le paiement CamerPay n'a pas pu être initialisé. Veuillez réessayer."
Après :
- Si 5xx persistant → "Notre passerelle de paiement est temporairement indisponible. Réessayez dans quelques instants ou contactez-nous sur WhatsApp pour finaliser votre commande **{order_ref}**."
- Si 4xx → message précis renvoyé par CamerPay (ex. "montant invalide").

### 3. Fallback visuel dans le checkout
Sur la page checkout, quand `initCamerPayCheckout` échoue, afficher un encart avec :
- Le bouton "Réessayer".
- Le bouton WhatsApp existant (numéro admin déjà en place), pré-rempli avec la référence de commande.

Aucun changement sur SebPay, Binance Pay, les webhooks, les workflows, ni les notifications.

### 4. Traçabilité
Chaque échec définitif (après retries) est loggé dans `integration_debug_logs` avec `provider=camerpay`, `status=520`, `order_ref`, afin qu'on puisse voir dans le NCC quand CamerPay retombe.

## Détails techniques

- Fichiers modifiés : `src/lib/payments-camerpay.server.ts`, `src/lib/payments.functions.ts`, le composant de checkout qui affiche l'erreur (`src/routes/checkout*` — je le repèrerai avant l'édition).
- Aucune migration DB.
- Aucun secret à ajouter.
- Le fix n'active pas de "faux paid" : la commande reste `pending` tant que CamerPay ne confirme rien via webhook signé.

## Action recommandée en parallèle (hors code)

Contacte le support CamerPay pour signaler l'incident 520 sur `/api/payment/initiate` — c'est chez eux que la panne se règle définitivement. Le code ci-dessus rend juste ton checkout tolérant à leurs micro-coupures.
