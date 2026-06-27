# NEXORA™ — Phase 1.5 · Intégration native MEGAOTT

## Principe

- Toutes les communications avec MEGAOTT passent **exclusivement** par
  l'Integration Hub (gateway, retry, timeout, rate-limit, logs).
- Aucun module métier n'importe directement l'adapter.
- SebPay reste totalement intact.

## Architecture

```
UI / Automation / Server fns
        │
        ▼
connectorRegistry.require("iptv.megaott")        ← src/integration-hub/index.ts
        │
        ▼
megaottConnector  (IPTVConnector)                ← src/integration-hub/connectors/iptv/megaott.adapter.ts
        │
        ▼
apiGateway.request(...)                          ← retry / timeout / metrics / rate-limit
        │
        ▼
MEGAOTT API (Bearer MEGAOTT_BEARER_TOKEN)
```

## Configuration

1. Le **Bearer Token** est stocké comme secret serveur : `MEGAOTT_BEARER_TOKEN`.
   Jamais exposé au navigateur.
2. Créer un fournisseur dans NCC → IPTV → Fournisseurs :
   - `name` contenant "megaott" (ex: "MEGAOTT") **ou** `metadata.kind = "megaott"`
   - `api_url` = URL racine de l'API MEGAOTT
   - (optionnel) `metadata.endpoints.{createUser,getUser,suspendUser,reactivateUser,extendUser,health}` pour surcharger les chemins par défaut
   - (optionnel) `metadata.default_package_id`

Le panneau **MEGAOTT** en haut de la page Fournisseurs indique en temps réel :
- Bearer Token configuré ✅/❌
- Fournisseur trouvé + URL API
- Bouton **Tester la connexion** (ping réel via le hub)

## Capacités exposées

`IPTVConnector` (générique, réutilisé pour Xtream UI / Codes plus tard) :
- `createUser({ username, password, packageId, expiresAt })`
- `getUser(providerUserId)`
- `suspendUser(providerUserId)`
- `reactivateUser(providerUserId)`
- `extend(providerUserId, expiresAt)`
- `isReady()`

## Server functions (`src/lib/iptv-megaott.functions.ts`)

| Fonction | Rôle |
|---|---|
| `megaottStatus` | État (token, provider, URL) |
| `megaottPing`   | Ping HTTP via le hub |
| `megaottCreateRemote(account_id)` | Provisionne l'utilisateur côté MEGAOTT et stocke `remote_user_id` + `m3u_url` dans `iptv_accounts.metadata` |
| `megaottSuspendRemote(account_id)` | Suspend distant + local |
| `megaottReactivateRemote(account_id)` | Réactive distant + local |
| `megaottExtendRemote(account_id, days)` | Prolonge distant + local |
| `megaottSyncRemote(account_id)` | Synchronise statut/expiration depuis MEGAOTT |

Toutes ces fonctions sont **admin-only** (`requireSupabaseAuth` + `has_role('admin')`).

## Intégration avec l'Automation Engine (v1.6)

Les actions `src/automation/actions/iptv.actions.ts` détectent automatiquement
si MEGAOTT est prêt :
- **Prêt** → l'action exécute réellement la création / prolongation / suspension distante via le hub, puis met à jour la BDD locale.
- **Non prêt** → l'action conserve son comportement local (aucune régression).

Aucun workflow existant n'a été modifié.

## Endpoints API (défauts — surchargeables par provider.metadata.endpoints)

| Opération | Méthode | Chemin par défaut |
|---|---|---|
| Create user | POST | `/api/v1/user` |
| Get user    | GET  | `/api/v1/user/{id}` |
| Suspend     | POST | `/api/v1/user/{id}/suspend` |
| Reactivate  | POST | `/api/v1/user/{id}/activate` |
| Extend      | PUT  | `/api/v1/user/{id}` |
| Health/ping | GET  | `/api/v1/user` |

## Sécurité

- Token jamais envoyé au client (server-only via `process.env`).
- Toutes les requêtes passent par `apiGateway` (timeout 20s, 3 retries, 60 req/min/host).
- Audit : chaque appel produit une entrée dans `iptv_logs` (action `megaott.*`).
- Aucune modification de SebPay, du Front Office ni des routes existantes.

## Tests sans MEGAOTT

- Le module IPTV (v1.4) reste 100% fonctionnel en simulation.
- Dès que `MEGAOTT_BEARER_TOKEN` + provider sont configurés, le bouton "Tester
  la connexion" et l'action `megaottCreateRemote` deviennent opérationnels
  sans aucun changement de code.

## Prochaines évolutions recommandées

- Endpoint webhook MEGAOTT → router public `/api/public/iptv/megaott/webhook` (signature à confirmer auprès du fournisseur).
- Synchronisation périodique via pg_cron → file d'attente automation.
- Tableau de bord MEGAOTT dédié (packages, bouquets, quotas reseller).
- Adapter Xtream UI / Codes (même interface `IPTVConnector`).