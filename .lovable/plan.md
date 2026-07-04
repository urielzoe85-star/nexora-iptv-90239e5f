# Espace Client Nexora IPTV

Portail personnel pour chaque abonné, accessible depuis le menu principal, avec renouvellement autonome.

## 1. Accès & authentification

- Nouvelle route publique `/espace-client` (lien ajouté au menu principal).
- Identification par **numéro de commande / username IPTV / email**.
- Envoi d'un **code OTP à 6 chiffres** par email (valide 10 min, table `client_portal_otps`).
- Après vérification, création d'une **session portail** (cookie httpOnly signé, 30 jours, table `client_portal_sessions`) — pas de mot de passe, pas de compte Supabase Auth requis (les clients ne sont pas des `auth.users`).
- Rate-limit sur envoi OTP (3/heure/email/IP).

## 2. Tableau de bord `/espace-client/dashboard`

Affiche :
- Nom, email, statut abonnement (Actif/Expiré), date d'expiration, jours restants
- Identifiant IPTV (username, masqué → révélable)
- Historique commandes (`orders`)
- Historique paiements (référence, méthode, montant, date)
- Factures téléchargeables (PDF généré à la volée depuis `orders`)

## 3. Renouvellement `/espace-client/renew`

- Bouton "Renouveler" → sélection durée (1/3/6/12 mois)
- Tarifs récupérés dynamiquement depuis la table `plans` existante (filtrés par durée)
- Choix moyen de paiement parmi les providers **activés** (SebPay, Binance Pay manuel, + futurs)
- Création d'une commande de type `renewal` liée à l'`iptv_account_id` existant

## 4. Réactivation automatique

- Nouveau workflow `subscription-renewal-portal` (déclenché par `payment.confirmed` sur commande `renewal`)
- Étapes :
  1. Résoudre `iptv_account_id` depuis la commande
  2. Appeler `renewIptvSubscription(accountId, months)` (déjà existant → MEGAOTT extend + update `expires_at`)
  3. Écrire événement dans `iptv_lifecycle_events`
  4. Envoyer email confirmation + WhatsApp/Telegram si configuré
- **Aucun nouveau compte IPTV** : mêmes credentials, expiration prolongée

## 5. Confirmation `/espace-client/renew/success`

Affiche : nouvelle date d'expiration, offre, réf paiement + confirme envoi email/WhatsApp.

## 6. Fonctionnalités additionnelles (architecture évolutive)

Layout `/espace-client/_portal` avec sidebar :
- Tableau de bord
- Mes abonnements
- Renouveler
- Commandes
- Paiements & factures
- Profil (nom, téléphone, pays)
- Support (crée un `support_ticket` avec `customer_id`)
- Téléchargements (guides installation — page statique)
- Annonces (table `portal_announcements`, admin peut publier)
- Déconnexion

## 7. Administration `/ncc/portal`

Nouveau module NCC :
- **Offres de renouvellement** : CRUD sur `renewal_plans` (durée, prix, actif/inactif)
- **Renouvellements** : liste filtrable (client / date / statut)
- **Remboursements** : action sur commande renewal
- **Sessions portail** : voir connexions récentes (email, IP, dernière activité)

## 8. Design

Réutilise identité Nexora IPTV existante (composants shadcn, tokens design system).
Layout responsive : sidebar desktop → drawer mobile.
Parcours : Connexion → Dashboard → Renouveler → Payer → Confirmation.

---

## Détails techniques

**Migration DB** :
- `client_portal_otps` (email, code_hash, expires_at, used_at, ip)
- `client_portal_sessions` (token_hash, customer_id, expires_at, last_seen_at, ip, user_agent)
- `renewal_plans` (duration_months, price, currency, active, sort_order)
- `portal_announcements` (title, body, published_at, active)
- GRANT + RLS : sessions/otps accessibles uniquement via service_role (server functions) ; `renewal_plans` lisible par `anon` (public) ; `portal_announcements` lisible `anon` si `active`.

**Server functions** (`src/lib/portal.functions.ts`) :
- `requestPortalOtp({identifier})` — résout customer via order_ref / iptv_username / email, envoie OTP
- `verifyPortalOtp({email, code})` — retourne session token
- `getPortalSession()` — middleware `requirePortalSession` lit cookie
- `getPortalDashboard()`, `getPortalOrders()`, `getPortalPayments()`, `getPortalSubscription()`
- `listRenewalPlans()`, `createRenewalOrder({planId, method})`
- `updateProfile()`, `createSupportTicketPortal()`, `signOutPortal()`

**Server routes** :
- `/api/portal/session` (GET/POST/DELETE) pour cookie
- `/api/portal/invoice/$orderRef` (GET PDF)

**Workflow** : `src/automation/workflows/subscription-renewal-portal.workflow.ts` enregistré dans `src/automation/index.ts`, déclenché après `payment.confirmed` si `orders.metadata.kind === "renewal"`.

**Génération facture** : lib légère (`@react-pdf/renderer` déjà utilisable, sinon HTML→print côté client via nouvelle route imprimable).

**Menu principal** : ajout item "Espace Client" dans le header du site public.

## Ordre d'implémentation

1. Migration DB + types
2. Auth OTP + session (server fns + route API cookie)
3. Layout `/espace-client/_portal` + login + dashboard
4. Renouvellement + workflow + confirmation
5. Onglets secondaires (commandes, paiements, factures, profil, support, annonces, téléchargements)
6. Module NCC `/ncc/portal`
7. Lien menu principal + polish responsive
