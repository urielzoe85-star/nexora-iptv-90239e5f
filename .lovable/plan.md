# Fiche de livraison IPTV NEXORA — workflow officiel

Objectif : quand une commande est payée, NEXORA attribue un compte IPTV, produit une fiche de livraison riche (équivalente MEGAOTT) et l'envoie automatiquement par Email + WhatsApp + Telegram, avec fallback manuel dans le NCC.

## 1. Modèle de données `iptv_delivery` (étendu)

Étendre `orders.metadata.iptv_delivery` (aucune migration SQL — JSONB) avec :

```
username, password, package, account_type ("trial"|"premium"),
provider, duration_months, expires_at, max_connections,
dns_link, dns_link_samsung_lg, portal_link,
m3u_url, m3u_with_options_url, enigma_url,
iptv_account_id, megaott_subscription_id,
delivery_status ("pending"|"ready_to_send"|"sending"|"sent"|"failed"),
channels_sent: { email?, whatsapp?, telegram? } (timestamps),
sent_at, sent_channel (dernier canal), created_at
```

Une fonction util `buildDeliveryFromAccount(account, order)` centralise la construction (utilisée par attribution auto ET manuelle).

## 2. Attribution & composition

- `src/automation/actions/iptv.actions.ts` → `composeIptvDelivery` enrichi : récupère TOUTES les colonnes de `iptv_accounts` (package, bouquet, max_connections, account_type, provider_id, dns_link, portal_link, m3u_url, enigma_url, …) et les copie dans `iptv_delivery`. Génère à la volée le M3U (`{dns}/get.php?username=X&password=Y&type=m3u_plus`) et lien Enigma si absents.
- Attribution manuelle (`assignIptvAccountToOrder` dans `iptv-import.functions.ts`) : appelle la même util → même fiche identique.
- Garde double-attribution : refuser si `iptv_delivery.iptv_account_id` déjà présent et `delivery_status != "failed"` (idempotence).

## 3. Envoi multi-canal automatique

Nouveau server fn `dispatchIptvDelivery({ orderId, channels? })` dans `src/lib/delivery.functions.ts` :

1. Lit la fiche depuis `orders.metadata.iptv_delivery`.
2. Rend le template `iptv-delivery.tsx` (enrichi ci-dessous) → envoie via `/lovable/email/transactional/send`.
3. WhatsApp : appelle `whatsappSendText` (connecteur existant `standard_connectors` WhatsApp Business si configuré, sinon marque `skipped`).
4. Telegram : appelle le bot existant (`src/routes/api/public/telegram/webhook.ts` a déjà un client) — sinon `skipped`.
5. Chaque envoi insère un `delivery_logs` row (channel, status sent/failed, content, provider_message_id).
6. Met à jour `iptv_delivery.channels_sent[channel] = timestamp`, `delivery_status = "sent"` si au moins un canal OK, sinon `"failed"`.
7. Passe `orders.status = "completed"` si `sent`.

Branché dans le workflow `payment-confirmed` en nouvelle étape `delivery:dispatch` après `delivery:compose`.

## 4. Fiche de livraison — template email + composant NCC partagé

- Nouveau composant `src/components/ncc/orders/DeliveryPreview.tsx` : rendu visuel identique à la capture MEGAOTT (dark card, sections Type, Link, Connection Details, boutons Copier identifiants / Copier M3U / Télécharger M3U / Télécharger Enigma / WhatsApp / Telegram, expiration, connexions, package, instructions courtes).
- `IptvDeliveryCard.tsx` remplace l'affichage actuel par `<DeliveryPreview />` + barre d'actions (Envoyer maintenant / Renvoyer / Attribuer manuellement si échec).
- Email template `iptv-delivery.tsx` réécrit avec les mêmes champs + CTA "Télécharger la playlist" (lien direct M3U) et instructions.
- Route téléchargement : `src/routes/api/public/iptv/playlist.ts` (`?token=…`) qui redirige vers le M3U signé (le token = signed hash du order_ref + account_id, TTL 30j) pour éviter de leaker les creds bruts dans l'URL email.

## 5. Back-office NCC

Dans `ncc.orders.$id` (via `IptvDeliveryCard`) :
- Preview WYSIWYG de la fiche identique à celle envoyée au client.
- Boutons : `Envoyer par Email`, `Envoyer WhatsApp`, `Envoyer Telegram`, `Tout envoyer` (appelle `dispatchIptvDelivery`).
- Badge statut par canal (envoyé / échec / non configuré).
- Si aucune attribution ou attribution échouée : bouton **Attribuer un compte** (dialog inventaire existant `AssignFromInventory`) → puis **Envoyer** relance `dispatchIptvDelivery`.

## 6. Tests E2E (`tests/e2e/sprint-1.6/`)

Nouveaux scripts Python :
- `01_auto_assignment.py` — paiement SebPay → run queue → vérifie `iptv_delivery` complet + `delivery_logs` sent.
- `02_manual_assignment.py` — commande sans attribution auto → appel `assignIptvAccountToOrder` → dispatch → assertions identiques.
- `03_delivery_card_generation.py` — vérifie tous les champs (M3U, Enigma, DNS Samsung, max_connections) présents.
- `04_channel_email.py`, `05_channel_whatsapp.py`, `06_channel_telegram.py` — chacun stub le connecteur correspondant et vérifie insertion `delivery_logs` + `channels_sent`.
- `07_double_assignment_guard.py` — deux tentatives d'attribution → 2e retourne 409/erreur, fiche inchangée.

Helpers réutilisent `tests/e2e/sprint-1.5/helpers/`.

## 7. Fichiers touchés

Créés :
- `src/components/ncc/orders/DeliveryPreview.tsx`
- `src/routes/api/public/iptv/playlist.ts`
- `src/lib/iptv-delivery.builder.ts` (util `buildDeliveryFromAccount`)
- `tests/e2e/sprint-1.6/*.py` (7 scripts + README)

Modifiés :
- `src/automation/actions/iptv.actions.ts` (`composeIptvDelivery` enrichi)
- `src/automation/workflows/payment-confirmed.workflow.ts` (+ step `delivery:dispatch`)
- `src/lib/delivery.functions.ts` (+ `dispatchIptvDelivery`)
- `src/lib/iptv-import.functions.ts` (`assignIptvAccountToOrder` → compose + dispatch, garde double-attribution)
- `src/components/ncc/orders/IptvDeliveryCard.tsx` (nouvelle preview + actions)
- `src/components/ncc/orders/DeliveryComposer.tsx` (canaux Email/WA/TG unifiés)
- `src/lib/email-templates/iptv-delivery.tsx` (design + champs)

Pas de migration SQL : tout tient dans `orders.metadata` + `delivery_logs` existants.

## Détails techniques

- WhatsApp/Telegram : si le connecteur n'est pas configuré (secret manquant), on marque `skipped` avec raison — pas d'échec dur, le run reste `sent` si l'email est passé.
- Le workflow `payment-confirmed` reste idempotent : `dispatchIptvDelivery` vérifie `channels_sent` par canal avant réenvoi.
- La preview NCC utilise exactement le même builder que l'email → parité garantie.
