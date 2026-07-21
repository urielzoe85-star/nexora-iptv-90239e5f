# Fix email (unsubscribe token) + Telegram via bot token direct

## Contexte
- **Email** : les envois via `EmailChannel` (Notifications) et `sendEmailAuto` (Services) sont rejetés par le processor avec `400 missing_unsubscribe`. Le payload envoyé à la queue `transactional_emails` n'inclut pas `unsubscribe_token` — le processor le refuse et le message part en DLQ.
- **Telegram** : le connecteur Lovable n'est pas relié dans ce workspace (`TELEGRAM_API_KEY` absent). Tu m'as fourni `@secret:TELEGRAM_BOT_TOKEN` (déjà présent dans les secrets). On bascule les envois Telegram sur des appels directs à l'API Bot Telegram (`api.telegram.org/bot<token>/...`) au lieu du gateway connecteur.
- **WhatsApp** : OK, rien à toucher.

## Changements

### 1. Email — injection du token de désabonnement
Dans `src/domain/providers/notifications.ts` (`EmailChannel.send`) et `src/lib/delivery.functions.ts` (`sendEmailAuto`) :
- Avant l'enqueue, appeler la RPC/logique existante (ou générer + insérer dans `email_unsubscribe_tokens`) pour obtenir un `unsubscribe_token` unique par destinataire + label.
- Ajouter `unsubscribe_token` dans le `payload` transmis à `enqueue_email` (aux côtés de `message_id`, `to`, `subject`, etc.).
- Aucun changement d'UI, aucun changement de sujet/HTML : c'est un champ métadonnée que le processor exige.

### 2. Telegram — appels directs Bot API
Refactor `src/lib/telegram.server.ts` :
- Remplacer les appels `connector-gateway.lovable.dev/telegram/...` par `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/<method>`.
- La fonction `creds()` lit `TELEGRAM_BOT_TOKEN` au lieu de `LOVABLE_API_KEY` + `TELEGRAM_API_KEY`.
- `tgSendMessage`, `notifyAdminTelegram`, `getWebhookInfo`, `getBotInfo`, `setWebhook` : signatures inchangées, seule l'URL/headers changent.

Aligner `src/lib/delivery.functions.ts` (`sendTelegramAuto`) :
- Utiliser `tgSendMessage` du helper au lieu de l'appel `fetch` gateway inline.
- Gate `if (!process.env.TELEGRAM_BOT_TOKEN)` remplace le check gateway.

Aligner `src/domain/providers/notifications.ts` (`TelegramChannel.enabled`) :
- Basé sur `TELEGRAM_BOT_TOKEN` uniquement.

Route webhook `src/routes/api/public/telegram/webhook.ts` (si présente) : dériver le `secret_token` depuis `TELEGRAM_BOT_TOKEN` au lieu de `TELEGRAM_API_KEY` pour rester cohérent (sinon les updates entrants ne matcheront plus). Si aucune route webhook n'existe, rien à faire.

### 3. Vérification post-fix
- Envoyer un email test depuis Notifications NCC → vérifier `email_send_log.status = sent`.
- Envoyer un Telegram test depuis Services NCC vers `TELEGRAM_ADMIN_CHAT_ID` → vérifier réception + `notifications.status = sent`.
- Purger/marquer failed les entrées DLQ liées aux anciens échecs `missing_unsubscribe` et `TELEGRAM_API_KEY manquant`.

## Fichiers touchés
- `src/domain/providers/notifications.ts`
- `src/lib/delivery.functions.ts`
- `src/lib/telegram.server.ts`
- `src/routes/api/public/telegram/webhook.ts` (si présente)

## Hors scope
Aucun changement UI, aucun changement de business logic (workflows, templates, contenus).
