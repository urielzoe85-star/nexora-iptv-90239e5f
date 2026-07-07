# Intégration WhatsApp Cloud API — Plan

## Contexte

Webhook réception déjà en place (`/api/public/whatsapp/webhook`) avec `WHATSAPP_VERIFY_TOKEN` + `WHATSAPP_APP_SECRET`. Il manque l'envoi et le traitement métier des messages entrants.

## Étape 1 — Secrets

Ajouter via formulaire sécurisé :
- `WHATSAPP_PHONE_NUMBER_ID` — ID du numéro (Meta Developer Console → WhatsApp → API Setup)
- `WHATSAPP_ACCESS_TOKEN` — token long-terme (System User dans Business Manager, permissions `whatsapp_business_messaging` + `whatsapp_business_management`)

## Étape 2 — Client d'envoi serveur

Nouveau fichier `src/lib/whatsapp.server.ts` :
- `sendWhatsAppText(to, body)` — message texte libre (fenêtre 24h après message client)
- `sendWhatsAppTemplate(to, templateName, lang, components)` — templates approuvés Meta (pour initier une conversation hors fenêtre 24h)
- Appel direct `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
- Gestion erreurs upstream avec `noteSecretInvalid` sur 401/403
- Retour typé `{ok, message_id}` / erreur explicite

## Étape 3 — Server function `sendWhatsAppAuto`

Dans `src/lib/delivery.functions.ts`, sur le modèle exact de `sendTelegramAuto` :
- Input : `order_id`, `to` (E.164), `text`, `template_id?`
- Appelle `whatsapp.server.ts`
- Log dans `delivery_logs` (status `automatic` / `failed`)
- Câbler dans `dispatchIptvDelivery` pour le canal `whatsapp`
- Brancher dans `iptv-dispatch.server.ts` (parité workflow `payment-confirmed`)

## Étape 4 — Adapter le connector

Remplacer le stub `whatsapp` dans `src/domain/providers/notifications.ts` par un adapter réel qui appelle `sendWhatsAppText`. Impact : les workflows d'automation utilisent enfin WhatsApp.

## Étape 5 — Réception & support

Étendre `POST` du webhook `/api/public/whatsapp/webhook` :
- Parser `entry[].changes[].value.messages[]` (texte, image, bouton)
- Créer / retrouver le customer par numéro (`customers.phone`)
- Insérer dans `support_messages` (thread par numéro) — nouvelle table si nécessaire
- Traiter les statuts (`sent`/`delivered`/`read`/`failed`) → mise à jour `delivery_logs`
- Notifier admin (Telegram + in-app) sur nouveau message entrant

## Étape 6 — UI NCC WhatsApp

Enrichir `src/routes/ncc.whatsapp.tsx` :
- Liste des conversations (numéro, dernier message, non-lus)
- Vue thread avec historique + composer d'envoi (rate-limit 24h respecté)
- Bouton « Renvoyer via template » quand fenêtre 24h expirée
- Bloc statut : phone number ID, quota, health check via API Meta

## Étape 7 — Tests

- Envoi manuel depuis NCC vers un numéro de test
- Simulation webhook entrant avec signature HMAC valide
- Vérification `delivery_logs` + affichage NCC
- Test échec (token expiré) → status `failed` + event `secret.invalid_use`

## Détails techniques

- Endpoint Graph API : `POST graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
- Body texte : `{messaging_product:"whatsapp", to, type:"text", text:{body}}`
- Templates : requis hors fenêtre 24h — à créer côté Meta (`order_delivered`, `renewal_reminder`)
- Sécurité : token jamais exposé côté client, chargement lazy dans handler serveur
- Rate limit : Meta impose 80 msg/s par numéro — pas de throttle nécessaire pour l'usage IPTV
