# NEXORA ERP — Phase 1 : Socle du NCC

## Objectif

Créer le squelette du **NEXORA Control Center** (back-office privé modulaire) en parallèle de l'admin existant, sans toucher au Front Office, à SebPay, au catalogue, au tunnel de commande, au SEO, aux traductions ni aux emails.

## Principe de cohabitation

- L'admin actuel (`/admin/*`) reste **inchangé** et 100 % fonctionnel.
- Le NCC vit sous un nouveau préfixe **`/ncc/*`** complètement isolé.
- Aucune route publique, aucun composant existant, aucun fichier `*.functions.ts` n'est modifié.
- Réutilise l'auth admin déjà en place (`getMyAdminStatus` + `requireSupabaseAuth`) — mêmes comptes, même garde.

## Arborescence ajoutée

```text
src/routes/
  ncc.tsx                      # Layout + garde admin (ssr:false)
  ncc.index.tsx                # Dashboard (mock data)
  ncc.clients.tsx              # "En préparation"
  ncc.products.tsx
  ncc.orders.tsx
  ncc.payments.tsx
  ncc.iptv.tsx                 # IPTV Manager
  ncc.trials.tsx               # Essais gratuits
  ncc.bots.tsx
  ncc.whatsapp.tsx
  ncc.telegram.tsx
  ncc.emails.tsx
  ncc.support.tsx
  ncc.analytics.tsx
  ncc.employees.tsx
  ncc.automation.tsx
  ncc.logs.tsx                 # Journal système
  ncc.settings.tsx             # Layout paramètres + Outlet
  ncc.settings.index.tsx       # Redirige vers /ncc/settings/company
  ncc.settings.$section.tsx    # company | payments | iptv | whatsapp | telegram | emails | seo | security | users | api | backups

src/components/ncc/
  NccShell.tsx                 # Sidebar + topbar + notifications
  NccSidebar.tsx               # Nav groupée (Cockpit / Ventes / Comms / Système)
  NccTopbar.tsx                # Search, notif bell, user menu
  NccModulePlaceholder.tsx     # Composant "En préparation" réutilisable
  NccPageHeader.tsx
  NccStatCard.tsx
  NccNotificationsPanel.tsx    # Sheet, mock
  modules/
    DashboardKpis.tsx          # 4 cards mock
    DashboardRevenueChart.tsx  # Recharts area, mock
    DashboardActivityFeed.tsx  # Liste mock
    LogsTable.tsx              # Table vide + filtres (sans data)

src/lib/ncc/
  modules.ts                   # Registre central : id, label, icon, route, group, status ('ready'|'preparing')
  mock-dashboard.ts            # Données fictives KPIs/series/activity
```

## Système de modules

Un seul fichier `src/lib/ncc/modules.ts` exporte la liste source de vérité utilisée par :
- la sidebar (groupes, ordre, icônes)
- les pages placeholder (titre, description, statut)
- futurs ajouts : un nouveau module = une entrée + un fichier route.

```ts
type ModuleStatus = 'ready' | 'preparing';
type NccModule = { id; label; description; icon; to; group; status };
```

Groupes : **Cockpit** (Dashboard, Analytics, Logs) · **Ventes** (Clients, Produits, Commandes, Paiements, Essais) · **Services** (IPTV, Bots, WhatsApp, Telegram, Emails) · **Opérations** (Support, Employés, Automatisation) · **Système** (Paramètres).

## Dashboard

- 4 `NccStatCard` (Revenu MRR, Clients actifs, Commandes 24h, Taux conversion) — mock.
- `DashboardRevenueChart` avec Recharts (déjà installé).
- `DashboardActivityFeed` — 6 événements fictifs.
- Bandeau d'alerte "Données de démonstration".

## Page placeholder "En préparation"

`NccModulePlaceholder` : icône module, titre, description, badge "En préparation", liste à puces des sous-fonctions futures, CTA désactivé. Utilisée par tous les modules non-dashboard sauf Logs et Settings.

## Journal système

`LogsTable` : header de table (Date, Niveau, Source, Message, Acteur), filtres (niveau, source, période) **non câblés**, état vide explicite. Aucune écriture, aucune lecture DB.

## Notifications

`NccNotificationsPanel` ouvert via cloche dans la topbar, contenu mock (3 notifs d'exemple), bouton "Tout marquer comme lu" désactivé.

## Paramètres

`ncc.settings.tsx` : layout 2 colonnes (nav verticale des 11 catégories à gauche + `<Outlet />`).
`ncc.settings.$section.tsx` : valide `section` contre la liste blanche, affiche `NccModulePlaceholder` avec le titre de la catégorie. Aucune logique.

## Garde d'accès

`ncc.tsx` réutilise exactement le pattern de `src/routes/admin.tsx` :
- `ssr: false`
- check `supabase.auth.getSession()` puis `getMyAdminStatus()`
- redirection vers `/admin/login` si non connecté ou non-admin
- aucun nouveau serverFn, aucune migration DB

## Hors périmètre (à proposer en rapport séparé après cette phase)

- Migration progressive `/admin/*` → `/ncc/*` (les deux coexistent pendant la transition).
- Table `system_logs` + helper `logEvent()` côté serverFns existants.
- Table `notifications` + realtime.
- Refonte du registre de modules en plugins dynamiques.
- Rôles fins (au-delà de `admin`) via `user_roles` enum étendu.

## Vérifications avant livraison

- `bun run build` (ou typecheck) passe.
- `/admin`, `/`, `/catalog`, `/checkout`, `/fr`, `/en`, `/de`, `/payment/success`, `/api/public/sebpay/webhook` inchangés.
- `/ncc` redirige vers `/admin/login` si non-admin, affiche le dashboard sinon.
- Chaque entrée de sidebar mène à une page qui s'affiche (placeholder ou réelle).

Confirme-moi pour que je lance l'implémentation, ou indique les modules à retirer/renommer.
