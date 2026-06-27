# Workflow semi-automatique MEGAOTT depuis les commandes

## Vérification technique iframe MEGAOTT

J'ai testé `https://megaott.net` :
- Aucun header `X-Frame-Options` ni `Content-Security-Policy: frame-ancestors` n'est renvoyé sur la racine.
- **MAIS** : MEGAOTT est protégé par **Cloudflare Bot Management** (la page `/login` renvoie déjà un `403`/challenge). En iframe cross-origin, Cloudflare bloquera quasi systématiquement le rendu (challenge JS + cookies tiers refusés par le navigateur).
- De plus, même si l'iframe affichait la page, le **login MEGAOTT serait demandé à chaque ouverture** (les cookies de session sont 3rd-party et bloqués par défaut sur Chrome/Safari/Firefox).

**Conclusion** : l'iframe intégrée n'est pas une option fiable.

## Alternative retenue (sans casser le workflow)

Ouvrir MEGAOTT dans une **fenêtre popup à côté** (window.open, taille ~1200×800) plutôt qu'en iframe. NEXORA garde la commande affichée à gauche, MEGAOTT s'ouvre en fenêtre séparée à droite. L'administrateur travaille naturellement en double écran logique, puis revient sur NEXORA pour saisir les identifiants générés.

C'est la solution utilisée par tous les ERP qui s'interfacent avec des panels protégés Cloudflare (Whapi, Smartmarketing, etc.).

## Plan d'implémentation

### 1. Détails commande — nouvelle section "Livraison IPTV"

Dans `src/routes/ncc.orders.$id.tsx`, ajouter sous la carte existante une nouvelle carte `IptvDeliveryCard` visible uniquement si `status ∈ {processing, completed}`.

États successifs (calculés depuis `orders.metadata.iptv_delivery`) :

```text
[1] Aucun abonnement      → bouton "Créer abonnement MEGAOTT" (ouvre popup)
                          → bouton "Abonnement créé — saisir les infos"
[2] Infos saisies         → récap (username, password, dns, expiration…)
                          → boutons "Envoyer par Email / WhatsApp / Telegram"
[3] Envoyé au client      → badge timestamp + canal
```

### 2. Ouverture MEGAOTT

Bouton "Créer abonnement MEGAOTT" :
- `window.open(megaottPanelUrl, "megaott_panel", "width=1280,height=900")`
- L'URL provient de `iptv_providers` (champ `api_url`, nettoyé : on garde l'origine, sans `/api/v1`).
- Un toast informe "Connectez-vous à MEGAOTT, créez l'abonnement, puis revenez ici."

### 3. Saisie des informations retournées par MEGAOTT

Nouveau composant `MegaottDeliveryForm.tsx` (modal) avec les champs :
- `megaott_subscription_id` (texte)
- `username` (texte)
- `password` (texte)
- `package` (texte)
- `expires_at` (date)
- `dns_link` (url)
- `dns_link_samsung_lg` (url, optionnel)
- `portal_link` (url, optionnel)
- `note` (textarea, optionnel)

Server fn `saveMegaottDelivery({ orderId, ...fields })` (dans `src/lib/orders.functions.ts`, protégée par `requireSupabaseAuth` + `has_role admin`) :
- crée une ligne dans `iptv_accounts` (status `active`, metadata complète) ;
- met à jour `orders.metadata.iptv_delivery = { iptv_account_id, delivery_status: "ready_to_send", created_at }` ;
- ne touche pas au statut commande tant que l'admin n'a pas envoyé au client (cf. ci-dessous).

### 4. Statuts commande

Pour éviter une migration sur l'enum `orders.status`, on garde l'enum existant et on ajoute deux champs dans `orders.metadata.iptv_delivery` :
- `delivery_status`: `"pending" | "ready_to_send" | "sent"`
- `sent_at`, `sent_channel`

Badge affiché dans la carte : « Abonnement créé · Prêt à envoyer ».

### 5. Envoi client (boutons d'architecture uniquement)

Trois boutons (Email / WhatsApp / Telegram). Chacun appelle la même server fn `markIptvDeliverySent({ orderId, channel })` qui :
- met `metadata.iptv_delivery.delivery_status = "sent"` + `sent_at` + `sent_channel` ;
- enregistre une ligne dans `notifications` (canal correspondant, status `sent`) — réutilise `NOTIFICATION_CHANNELS_REGISTRY` qui est déjà un stub ; aucun envoi réel pour le moment.
- ajoute un log `iptv_logs`.

Aucune intégration WhatsApp/Telegram réelle (conforme à la demande "uniquement les boutons et l'architecture").

### 6. Contraintes respectées

- ✅ Intégration API MEGAOTT existante **conservée** (`megaott.adapter.ts`, `MegaottPanel`, page debug).
- ✅ SebPay non modifié.
- ✅ Front Office non modifié.
- ✅ Aucun formulaire de création MEGAOTT recréé : `MegaottSubscriptionForm.tsx` reste accessible depuis `/ncc/iptv/providers` pour les power users, mais n'est plus le chemin principal depuis la commande.
- ✅ Aucune migration de schéma SQL (tout passe par `orders.metadata` jsonb déjà existant et `iptv_accounts`).

## Fichiers touchés

- `src/components/ncc/orders/IptvDeliveryCard.tsx` *(nouveau)*
- `src/components/ncc/orders/MegaottDeliveryForm.tsx` *(nouveau)*
- `src/routes/ncc.orders.$id.tsx` *(intégration de la carte)*
- `src/lib/orders.functions.ts` *(server fns `saveMegaottDelivery`, `markIptvDeliverySent`, `getMegaottPanelUrl`)*

## Hors scope (à confirmer)

- Génération réelle d'emails / WhatsApp / Telegram (stub uniquement comme demandé).
- Aucune modification d'`iptv_accounts` côté schéma.
- Pas de nouvelle valeur d'enum `orders.status` (on s'appuie sur `metadata`).

Validez ce plan et je l'implémente.
