# Templates multi-canal + Envoi en masse (bulk)

Objectif : disposer de **messages pré-rédigés** — équivalents aux templates email — utilisables sur WhatsApp / Telegram / Email pour 3 scénarios de relance, avec **envoi en masse** depuis le NCC.

## 1. Trois nouveaux templates (FR + EN chacun)

Ajoutés dans `src/domain/delivery/builtin-templates.ts` (moteur `message-engine.ts` déjà en place, réutilise les mêmes variables `{{client_name}}`, `{{username}}`, `{{expiration_date}}`, `{{order_ref}}`, `{{portal_link}}`, etc.) :

- **`delivery_*`** — Livraison des accès (relance client qui n'a pas reçu / redemande ses infos). Réutilise le contexte accès complet.
- **`renewal_j7`, `renewal_j3`, `renewal_j1`** — Rappels de renouvellement avant expiration, avec CTA `{{renew_url}}` (nouvelle variable ajoutée au `DeliveryContext`, dérivée de `portal_link`).
- **`payment_reminder_*`** — Relance paiement en attente (commande créée non payée), avec `{{payment_url}}` (déduit de `order.metadata.checkout_url` sinon lien portail).

Chaque template a une version WhatsApp/Telegram (courte, emojis discrets) + une variante Email (sujet + corps plus long). Ils utilisent la même clé pour que le sélecteur du composer les retrouve.

## 2. Extension du contexte de rendu

`buildDeliveryContext` dans `src/domain/delivery/message-engine.ts` : ajouter `renew_url`, `payment_url`, `days_left`, `amount_due`, `currency`. Rétro-compatible (valeurs `—` par défaut).

## 3. Page « Envoi en masse » dans le NCC

Nouvelle route `src/routes/ncc.bulk.tsx` + page `src/components/ncc/bulk/BulkSendPage.tsx` :

- **Sélection de la cible** :
  - Scénario `delivery` → commandes payées récentes
  - Scénario `renewal` → abonnements expirant dans N jours (7/3/1) via `iptv_accounts.expires_at`
  - Scénario `payment_reminder` → commandes `pending_payment` > X heures
- **Choix du template** (parmi ceux du bloc 1, filtrés par scénario) + **preview** rendu avec la 1ʳᵉ ligne cochée.
- **Choix des canaux** (checkboxes WhatsApp / Telegram / Email — multi).
- **Table** des destinataires cochables avec colonnes : client, contact WA/TG/email dispo, statut. Case « tout sélectionner ».
- **Bouton « Envoyer »** → confirmation modale (nombre de messages, canaux, coût estimé Meta).

## 4. Server function `bulkSendMessages`

Nouveau fichier `src/lib/bulk-send.functions.ts` (protégé par `requireNccUnlock`) :

- Input : `{ template_id, channels[], target_ids[], scenario }`.
- Pour chaque cible : construit le contexte, rend le template, appelle en interne `sendWhatsAppAuto` / `sendTelegramAuto` / `sendEmailAuto` (déjà existants dans `src/lib/delivery.functions.ts`).
- Throttle : 5 messages/seconde côté serveur pour respecter les quotas Meta.
- Retourne un résumé `{ sent, failed, skipped, errors[] }` — affiché en toast + résumé après envoi.
- Chaque envoi est déjà loggé dans `delivery_logs` par les fonctions unitaires → traçabilité gratuite dans **NCC → Notifications**.

## 5. Cible de la sidebar

Ajouter une entrée « Envoi en masse » dans `src/components/ncc/NccSidebar.tsx` (icône `Megaphone`) pointant vers `/ncc/bulk`.

## Fichiers touchés

- `src/domain/delivery/builtin-templates.ts` (ajout templates)
- `src/domain/delivery/message-engine.ts` (contexte étendu)
- `src/lib/bulk-send.functions.ts` (nouveau — server fn)
- `src/components/ncc/bulk/BulkSendPage.tsx` (nouveau — UI)
- `src/routes/ncc.bulk.tsx` (nouveau)
- `src/components/ncc/NccSidebar.tsx` (lien menu)

## Hors scope (à demander si besoin plus tard)

- Programmation (cron) automatique des rappels J-7/J-3/J-1 : déjà partiellement géré par `payment-confirmed` + `iptv-renewal-reminder` email — bulk = envoi **manuel** à la demande.
- Éditeur visuel de templates (les templates restent en code).
