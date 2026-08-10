# Commande client → abonnement MEGAOTT 100 % automatique

## Réponse : oui, c'est possible

`POST /api/v1/subscriptions` crée l'abonnement et renvoie immédiatement
`username`, `password`, `expiring_at`, `dns_link`, `dns_link_for_samsung_lg`,
`portal_link`. C'est exactement ce qu'il faut pour livrer un client sans
intervention humaine : paiement confirmé → création → livraison
email / WhatsApp / Telegram.

**Mais aujourd'hui ça ne se fait pas automatiquement**, pour deux raisons
vérifiées dans le code :

1. `src/integration-hub/connectors/iptv/megaott.adapter.ts` appelle
   `POST /api/v1/user` avec `bouquet_id` / `exp_date` — endpoint et champs qui
   n'existent pas dans l'API officielle. Tout appel réel échoue.
2. `src/automation/actions/iptv.actions.ts` (ligne 157) pioche **d'abord** dans
   le stock local importé (`local_pool_first`) et ne contacte MEGAOTT que si le
   stock est vide. Donc même une fois l'API réparée, la création distante n'est
   quasi jamais déclenchée.

Seules informations absentes de la doc : la **liste des `package_id` /
`template_id`** (aucun endpoint catalogue) et **aucun webhook**. Couvert par
configuration + synchronisation périodique.

## Écarts constatés (vérifiés dans le code)

| Opération | Code actuel | API officielle |
|---|---|---|
| Créer | `POST /api/v1/user` avec `username, password, package_id, bouquet_id, exp_date` | `POST /api/v1/subscriptions` avec `type`, `username` ou `mac_address`, `package_id`, `template_id`, `max_connections`, `forced_country`, `adult`, `whatsapp_telegram`, `enable_vpn`, `paid`, `note` (form-urlencoded) |
| Lire | `GET /api/v1/user/{id}` | `GET /api/v1/subscriptions/{id}` |
| Prolonger | `PUT /api/v1/user/{id}` avec `exp_date` | `POST /api/v1/subscriptions/{id}/extend` avec `package_id` + `paid` |
| Suspendre | `POST /api/v1/user/{id}/suspend` | `POST /api/v1/subscriptions/{id}/deactivate` |
| Réactiver | `POST /api/v1/user/{id}/activate` | `POST /api/v1/subscriptions/{id}/activate` |
| Champs lus | `status`, `exp_date`, `m3u_url` | pas de `status` ; `expiring_at`, `dns_link`, `dns_link_for_samsung_lg`, `portal_link`, `package{id,name}`, `template{id,name}` |
| Formulaire NCC | envoie `package`, `template`, `mac` | attend `package_id`, `template_id`, `mac_address` |

## Ce qui sera fait

1. **Adapter MEGAOTT réécrit sur les vrais endpoints** : chemins
   `/api/v1/subscriptions*`, corps envoyé en `application/x-www-form-urlencoded`
   (booléens en `0/1`), parsing du vrai modèle d'abonnement (id, username,
   password, `expiring_at`, liens DNS / portal, package et template).
   Les overrides `metadata.endpoints.*` restent supportés.
2. **Prolongation par package** : `extend` prend un `package_id` (la durée vient
   du package MEGAOTT) au lieu d'une date. Les server functions et l'action
   d'automatisation « renouvellement » sont adaptées.
3. **Formulaire « Nouvel abonnement MEGAOTT »** corrigé : `package_id`,
   `template_id`, `mac_address`, et affichage des liens réellement renvoyés.
4. **Mapping plan Nexora → package MEGAOTT** : correspondance configurable
   (offre / durée → `package_id`, `template_id`, `max_connections`) pour que la
   création soit automatique après paiement, sans saisie admin.
5. **Automatisation de bout en bout** : inversion de la priorité dans
   `createIptvSubscription` — MEGAOTT d'abord, stock local en secours si l'API
   échoue. L'abonnement est créé avec le package correspondant au plan acheté,
   `remote_user_id` + liens sont enregistrés dans `iptv_accounts.metadata`, puis
   `delivery:compose` / `delivery:dispatch` livrent le client automatiquement
   (email / WhatsApp / Telegram) avec les identifiants réels. Un échec MEGAOTT
   sans stock local laisse la commande en « à traiter » + alerte admin, jamais
   de livraison vide.
6. **Synchronisation périodique** (à la place du webhook inexistant) : job qui
   interroge `GET /api/v1/subscriptions/{id}` pour rafraîchir l'expiration et
   détecter les comptes expirés.
7. **Ping / statut** basé sur un endpoint réel ; journalisation inchangée
   (`iptv_logs` + `integration_debug_logs`).

## Détails techniques

- Aucun changement sur SebPay, les paiements, les emails ou le front public.
- Le token reste le secret serveur `MEGAOTT_BEARER_TOKEN` (Bearer +
  `Accept: application/json`).
- `api_url` du fournisseur doit être `https://megaott.net` (le dédoublonnage de
  segments existant tolère `https://megaott.net/api`).
- Le connecteur enverra `Content-Type: application/x-www-form-urlencoded`,
  conformément aux exemples cURL de la doc.
- Toutes les opérations restent admin-only (`requireNccUnlock` + `has_role('admin')`).

## À confirmer

Il me faut la liste de tes **packages MEGAOTT** (id + durée : 1, 3, 6, 12 mois)
et l'`id` du **template** à utiliser, pour câbler le mapping automatique. Sinon
je livre le mapping vide et tu le remplis dans NCC.