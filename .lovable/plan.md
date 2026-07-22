## Audit end-to-end : Webhooks, Paiements, Email, Telegram, WhatsApp

Objectif : vérifier en profondeur chaque canal critique et faire des tests réels pour confirmer que tout fonctionne en production.

### 1. Inventaire & état
- Lister les secrets présents (`fetch_secrets`) : CamerPay, SebPay, Stripe, PayPal, Resend/domain, Telegram, WhatsApp, unsubscribe.
- Vérifier l'état du domaine email (`check_email_domain_status`) sur `notify.account.nexora-iptv.com`.
- Lister connectors actifs (Telegram, GatewayAPI, etc.).

### 2. Webhooks publics — vérification code + accessibilité
Pour chaque route sous `src/routes/api/public/*` :
- `/camerpay/webhook`, `/stripe/webhook`, `/paypal/webhook` (CamerPay agrégateur, HMAC partagé)
- `/sebpay/webhook`
- `/telegram/webhook`
- webhooks email (bounces/complaints), cron automation

Vérifs :
- Signature HMAC / bearer présente et timing-safe
- Aucun leak PII dans logs
- Réponse 200/401 correcte
- Ping réel via `curl` (payload invalide → doit renvoyer 401)

### 3. Paiements — tests réels
- **CamerPay** : appeler `initCamerPayCheckout` avec un montant test → vérifier URL retournée + logs.
- **SebPay** : idem `initSebPayCheckout` + fallback automatique.
- Simuler un webhook signé (payload de test HMAC) sur les 3 URLs CamerPay → vérifier update `orders.status` + log `security_events`.
- Vérifier `orders` récents : pas de commandes bloquées en `pending` sans raison.

### 4. Email — test réel
- État queue pgmq (`auth_emails`, `transactional_emails`), DLQ count.
- `email_send_log` 24h : ratio sent/failed/dlq.
- Envoyer un email test via le service NCC (template `test-notification`) vers une adresse fournie → confirmer `sent`.
- Vérifier `unsubscribe_token` bien injecté.

### 5. Telegram — test réel
- `getWebhookInfo` via connector gateway → URL correcte, pas d'erreurs récentes.
- Envoyer un message test à l'admin (`chat_id 5533621492`) → confirmer réception.
- Vérifier réception d'un message entrant (log dans `telegram_messages` si existant).

### 6. WhatsApp Cloud API — test réel
- `GET /me` sur Meta Graph pour valider token.
- Envoyer un template `hello_world` (ou template approuvé) vers `237698608808` → vérifier code 200 + `wamid`.
- Diagnostiquer erreurs Meta si échec (token expiré, template non approuvé, numéro non autorisé).

### 7. Rapport final
Tableau récapitulatif par canal :
| Canal | État | Test réel | Action requise |
Avec les erreurs exactes remontées et un plan de correction ciblé (à exécuter dans un second passage build si nécessaire).

### Note
Cet audit est **lecture seule + tests d'envoi**. Aucun changement de code ou config n'est effectué à cette étape. Si des bugs sont détectés, je proposerai un plan de correction séparé.
