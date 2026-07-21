## Objectif

Email fonctionne — on n'y touche pas. On répare et vérifie en profondeur **WhatsApp** et **Telegram** pour que l'envoi passe depuis Notifications ET depuis Services (NCC admin).

## Diagnostic à confirmer avant fix

### Telegram
- Vérifier `getMe` (bot token valide) et `getWebhookInfo` (webhook enregistré avec le bon secret dérivé de `TELEGRAM_BOT_TOKEN`).
- Vérifier que `TELEGRAM_ADMIN_CHAT_ID` est bien un chat_id numérique (pas un numéro de téléphone) — sinon les alertes admin échouent silencieusement.
- Vérifier que les envois clients utilisent bien un `chat_id` Telegram stocké côté commande/client, pas un handle `@username` ni un téléphone.
- Purger les entrées DLQ Telegram héritées de l'ancien workspace.

### WhatsApp
- Vérifier les creds via `graph.facebook.com/v21.0/{PHONE_NUMBER_ID}` avec `WHATSAPP_ACCESS_TOKEN` (statut token, phone number id valide, business account actif).
- Reproduire un envoi via la route de test `/api/public/whatsapp/test-send` et capturer la réponse Meta exacte (code + `error.message` + `error.code`).
- Causes probables à trancher selon la réponse Meta :
  - **Fenêtre 24h expirée** → Meta renvoie `#131047` / `re-engagement`. Fix : passer par `sendWhatsAppTemplate` (template pré-approuvé) au lieu de `sendWhatsAppText` pour initier / relancer hors fenêtre.
  - **Token expiré / invalide** → `#190`. Fix : demander rotation `WHATSAPP_ACCESS_TOKEN` (token système utilisateur long-lived).
  - **Numéro destinataire mal formé** → renforcer `normalizeWaNumber` (imposer indicatif pays, rejeter numéros < 8 chiffres avant appel Meta).
  - **Phone number ID / WABA non lié** → guider vers Meta Business Manager.

## Fix à appliquer

### Telegram
1. Ré-enregistrer le webhook Telegram sur l'URL publique stable `project--<id>-dev.lovable.app/api/public/telegram/webhook` avec `setWebhook` (secret = `sha256("telegram-webhook:" + BOT_TOKEN)` base64url).
2. `notifyAdminTelegram` : logger explicitement quand `TELEGRAM_ADMIN_CHAT_ID` ressemble à un numéro de téléphone (pas un chat_id) au lieu d'échouer en silence.
3. Dans `sendTelegramAuto` (delivery.functions.ts) et le dispatch NCC : refuser proprement si `chat_id` n'est pas numérique/valide, avec message d'erreur clair remonté dans `delivery_logs.error` et dans l'UI NCC.
4. Purger DLQ `auth_emails` / `transactional_emails` seulement si des entrées Telegram y traînent (elles ne devraient pas — Telegram n'utilise pas pgmq).

### WhatsApp
1. Lancer le test `/api/public/whatsapp/test-send?token=…&to=…` et capturer la réponse Meta brute.
2. Selon le code d'erreur Meta remonté :
   - Si `#131047` (hors fenêtre 24h) : ajouter le support des templates Meta dans `sendWhatsAppAuto` (choix `text` vs `template`), et documenter côté NCC quel template pré-approuvé utiliser pour la première prise de contact.
   - Si `#190` : marquer le secret comme invalide via `noteSecretInvalid` et demander la rotation du token.
   - Si erreur numéro : durcir `normalizeWaNumber` (E.164 strict, refus si < 10 chiffres).
3. Améliorer la remontée d'erreur dans `sendWhatsAppAuto` : `delivery_logs.error` doit contenir `error.code` + `error.message` Meta bruts (pas juste `HTTP xxx`).
4. Vérifier que le dispatch depuis Services NCC utilise bien un numéro E.164 (pas un handle) — sinon corriger le formulaire d'envoi.

## Vérification E2E

Après fix, depuis l'admin NCC :
1. **Notifications** → envoyer un message test WhatsApp + Telegram vers l'admin, contrôler `delivery_logs` (status `automatic`).
2. **Services** → sur une vraie commande, cliquer "Envoyer maintenant" (dispatch multi-canal), vérifier les 3 canaux (email inchangé, WhatsApp OK, Telegram OK).
3. Afficher les erreurs Meta / Telegram exactes si un canal reste bloqué, avec la cause précise (fenêtre 24h, chat_id manquant, token expiré, etc.).

## Fichiers concernés (aucune modif email)

- `src/lib/telegram.server.ts` — validation chat_id + logs
- `src/lib/whatsapp.server.ts` — remontée erreurs Meta enrichie + normalisation stricte
- `src/lib/delivery.functions.ts` — messages d'erreur clairs pour Telegram/WhatsApp (email inchangé)
- `src/routes/api/public/telegram/webhook.ts` — ré-enregistrement webhook (opération runtime, pas code)
- NCC UI dispatch : affichage de l'erreur Meta/Telegram brute si échec
