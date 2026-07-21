## Objectif
Réparer le webhook Telegram pour que les messages entrants (commandes `/start`, `/status`, `/help`) soient à nouveau traités. Les envois sortants (alertes admin, diffusion, livraison IPTV) fonctionnent déjà — test admin confirmé à `chat_id 5533621492` (@CaptaineCameroun).

## Constat vérifié cette session
- `getMe` OK → bot `@NexoraIPTVBot` (id 8857753150) actif.
- `getWebhookInfo` → URL correcte, mais `last_error_message: "Wrong response from the webhook: 401 Unauthorized"`.
- `sendMessage` vers `TELEGRAM_ADMIN_CHAT_ID` → succès (`message_id 57`).
- La route `src/routes/api/public/telegram/webhook.ts` calcule le secret attendu comme `sha256("telegram-webhook:" + TELEGRAM_BOT_TOKEN)` en base64url ; le secret enregistré côté Telegram date de l'ancien workspace et ne correspond plus.

## Étapes
1. Ré-enregistrer le webhook Telegram via `setWebhook` avec le secret dérivé du `TELEGRAM_BOT_TOKEN` actuel (identique à `src/lib/telegram.server.ts` → `setWebhook`) sur l'URL stable `https://nexora-iptv.com/api/public/telegram/webhook`, `allowed_updates: ["message","edited_message"]`.
2. Vérifier avec `getWebhookInfo` que `last_error_message` est vide et `pending_update_count` diminue.
3. Envoyer un second message de test admin pour confirmer le canal sortant après ré-enregistrement.
4. Rapporter au user le statut final (bot, webhook, admin chat_id) sans modifier de code — aucun fichier à changer, seulement des appels API.

## Aucune modification de code
Le code webhook et les helpers Telegram sont corrects. Il s'agit uniquement d'une opération de reconfiguration côté API Telegram.
