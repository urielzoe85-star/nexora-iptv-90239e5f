## Objectif

Vérifier que les 3 canaux (Email, WhatsApp, Telegram) fonctionnent bout-en-bout depuis les deux points d'entrée admin du NCC, et remonter les erreurs exactes en cas d'échec.

## Points d'entrée testés

1. **NCC → Notifications** (`/ncc/notifications`) — appel de `sendNotification` via `NotificationsView`, qui passe par `NOTIFICATION_CHANNELS_REGISTRY` (`src/domain/providers/notifications.ts`).
2. **NCC → Services** (composer de livraison / delivery admin) — appel des helpers `sendEmailAuto`, `sendWhatsAppAuto`, `sendTelegramAuto` dans `src/lib/delivery.functions.ts`.

## Déroulé du test

Pour chaque point d'entrée × chaque canal (6 combinaisons) :

1. Déclencher un envoi réel via un server function call authentifié admin
   (Playwright sur `localhost:8080` avec session Supabase injectée) avec des
   destinataires de test :
   - Email → adresse fournie par l'utilisateur (à confirmer, voir Questions).
   - WhatsApp → numéro admin `698608808` (déjà configuré côté secrets).
   - Telegram → `TELEGRAM_ADMIN_CHAT_ID` du projet.
2. Capturer :
   - Réponse immédiate du server fn (status/error).
   - Ligne insérée dans `notifications` (status, error).
   - Pour email : ligne(s) `email_send_log` (`pending` → `sent`/`dlq` + `error_message`).
   - Pour WhatsApp : code Meta Graph + `data.error.message`.
   - Pour Telegram : réponse du gateway Lovable.
3. Après ~15s, rejouer une lecture des mêmes tables pour attraper l'état final
   après passage du cron `process-email-queue`.

## Diagnostic & rapport

Produire un tableau récapitulatif :

```text
Canal      | Point d'entrée   | Résultat | Erreur exacte
-----------+------------------+----------+---------------------------
email      | Notifications    | ?        | ?
email      | Services         | ?        | ?
whatsapp   | Notifications    | ?        | ?
whatsapp   | Services         | ?        | ?
telegram   | Notifications    | ?        | ?
telegram   | Services         | ?        | ?
```

Pour chaque KO : citer la ligne SQL / le status HTTP / le message provider
(ex. `403 domain_not_verified`, `chat not found`, `#131030 recipient not in
allowed list`) et proposer le correctif ciblé (secret, domaine, opt-in
WhatsApp, template requis hors fenêtre 24h, etc.).

## Aucune modification de code prévue

Ce plan est purement diagnostic. Les correctifs éventuels feront l'objet d'un
plan de suivi une fois les erreurs exactes identifiées.

## Questions avant exécution

- Adresse email de test à utiliser pour la réception réelle ?
- OK pour envoyer sur le numéro WhatsApp admin `698608808` et le chat Telegram admin ?
