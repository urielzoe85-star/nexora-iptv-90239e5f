# NEXORA™️ ERP — Version 1.4 · IPTV Automation Engine

## Objectif
Mettre en place le moteur complet de gestion IPTV (comptes, fournisseurs,
essais, abonnements, renouvellements, journaux), branché sur l'Integration
Hub mis en place en 1.3. Aucune modification de SebPay ni du Front Office.

## Schéma de données
- `iptv_providers` — fournisseur configurable (api_url, panel_url, api_key,
  username, password, status, is_default). Un seul `is_default = true`
  (index unique partiel).
- `iptv_accounts` — réserve unifiée trial / premium.
  Statuts : `available | assigned | active | expired | suspended`.
  FKs : `provider_id`, `customer_id` (SET NULL).
- `iptv_logs` — journal d'événements (action, message, payload jsonb).

RLS : admin-only via `public.has_role(auth.uid(),'admin')`.

## Services métier (src/domain/iptv/services.ts)
- `ProviderService` — CRUD + activation + accès aux connecteurs Hub.
- `IPTVAccountService` — CRUD repository + transitions + import/export CSV.
- `TrialService` — réserve d'essais + réservation client.
- `SubscriptionProvisionService` — réserve premium + activation/renouvellement.
- `ProviderHealthService` — santé fournisseur (extensible).
- `IPTVSyncService` — squelette de synchronisation (no-op à ce stade).
- `IPTVLogService` / `IPTVDashboardService` — consultation et KPIs.

Toutes les opérations passent par `src/lib/iptv.functions.ts` (server
functions `createServerFn` + `requireSupabaseAuth` + double-check `has_role`).

## Lien avec l'Integration Hub
- Connecteurs IPTV stub déjà enregistrés en 1.3 (`iptv.megaott`,
  `iptv.xtream_ui`, `iptv.xtream_codes`) : inchangés.
- `ProviderService.registered()` retourne les connecteurs enregistrés ;
  point d'extension pour brancher un `iptv_providers` UI sur un adapter
  réel via `connectorRegistry.require<IPTVConnector>(id)`.
- Aucune connexion réelle n'est faite ; `ProviderHealthService.check`
  vérifie qu'une `api_url` est renseignée et trace l'événement.

## Modules UI (/ncc/iptv)
Layout `ncc.iptv.tsx` avec onglets :
- `/ncc/iptv` — Dashboard (8 KPIs)
- `/ncc/iptv/accounts` — tous les comptes
- `/ncc/iptv/trials` — pool d'essais
- `/ncc/iptv/premium` — pool premium
- `/ncc/iptv/renewals` — expirent dans ≤ 7 jours
- `/ncc/iptv/suspended` — comptes suspendus
- `/ncc/iptv/expired` — comptes expirés
- `/ncc/iptv/subscriptions` — vue abonnements (préservée)
- `/ncc/iptv/providers` — configuration fournisseurs + test
- `/ncc/iptv/history` — journal IPTV

## Permissions
L'enum `app_role` reste inchangé (`admin`). Les rôles fins
`manager / support / viewer` arriveront via une migration dédiée et
remplaceront le check `has_role(...,'admin')` dans les server functions ;
aucune logique UI ne sera à modifier grâce aux services.

## Extensions prévues
- Distribution automatique des essais sur paiement / inscription.
- Synchronisation périodique des statuts (cron + `IPTVSyncService`).
- Provisioning auto via adapter `IPTVConnector` réel (MEGAOTT, Xtream).
- Webhooks fournisseurs via `webhookEngine` (déjà disponible).
- Rôles fins (Manager / Support / Viewer).

## Contraintes respectées
- SebPay : zéro modification (lib, route, webhook, secrets).
- Front Office : aucune route publique touchée.
- Pas de connexion réelle à un fournisseur IPTV tant qu'aucune
  configuration n'est renseignée.
- Toute opération IPTV passe par `src/lib/iptv.functions.ts` ou
  `src/domain/iptv/services.ts`.