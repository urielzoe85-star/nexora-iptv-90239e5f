# Passage du NCC en mode réel (fin du mode démo)

## Objectif
Supprimer toutes les données mock/démo encore visibles dans le NCC (Nexora Control Center) et brancher chaque widget sur des données réelles issues de la base (orders, customers, subscriptions, customer_events, notifications, iptv_logs).

## Portée
Uniquement les 4 endroits du NCC qui affichent encore de la démo :
1. Graphique revenus du dashboard
2. Fil d'activité récente du dashboard
3. Panneau de notifications (cloche en haut à droite)
4. Composant `DashboardKpis` mock (non utilisé aujourd'hui)

Aucun changement de style, de layout, de couleurs ou de logique métier. Le reste du NCC (Analytics, Clients, Commandes, Produits, Paiements, IPTV, etc.) est déjà en données réelles et n'est pas touché.

## Changements

### 1. Nouvelle fonction serveur `getDashboardOverview`
Fichier : `src/lib/ncc.functions.ts` — ajout d'une fonction protégée par `requireNccUnlock` qui renvoie en un seul appel :
- `series` : revenus des 30 derniers jours (paid + completed, groupés par jour) — même logique que `getAnalyticsSnapshot` mais fixée à 30 jours et exposée au dashboard.
- `activity` : 12 derniers évènements réels, agrégés depuis :
  - `orders` récents (création, changement de statut vers paid/completed)
  - `customer_events` (created, updated, status changes)
  - `iptv_logs` récents (provisionnement, renouvellement, expiration)
  - `support_tickets` récents
  Chaque item : `{ id, kind: 'order'|'payment'|'support'|'iptv'|'trial'|'customer', who, what, when (ISO) }`. Le composant formatera « il y a X min ».

### 2. `src/components/ncc/modules/DashboardRevenueChart.tsx`
- Supprimer l'import `mockRevenueSeries`.
- Consommer `getDashboardOverview` via `useQuery` + `useServerFn` et alimenter `<AreaChart data={series} />`.
- État vide : afficher « Aucun revenu sur la période » quand la série est entièrement à zéro. État chargement : petit skeleton dans la même hauteur.

### 3. `src/components/ncc/modules/DashboardActivityFeed.tsx`
- Supprimer l'import `mockActivity`.
- Consommer la même query `getDashboardOverview` (partagée via `queryKey: ['ncc','dashboard-overview']`) pour éviter un second round-trip.
- Formater `when` en français relatif (« il y a 3 min », « il y a 2 h », « hier »).
- État vide : « Aucune activité récente ».

### 4. `src/components/ncc/NccNotificationsPanel.tsx`
- Supprimer `mockNotifs` et la mention « (démo) ».
- Charger les 20 dernières lignes de la table `notifications` via une nouvelle fonction serveur `listRecentNotifications` (protégée `requireNccUnlock`), rendues avec icône selon `status` (`sent` → check vert, `failed` → alerte ambre, autres → info). Sous-titre : `Aperçu des évènements récents`.
- Le bouton « Tout marquer comme lu » reste désactivé (pas de champ `read_at` sur la table ; hors périmètre).

### 5. Nettoyage
- Supprimer `src/lib/ncc/mock-dashboard.ts`.
- Supprimer `src/components/ncc/modules/DashboardKpis.tsx` (composant mock non référencé).

## Détails techniques

- Les nouvelles fonctions serveur restent dans `src/lib/ncc.functions.ts`, en `createServerFn({ method: 'POST' }).middleware([requireNccUnlock])`, et importent `supabase-admin.server` uniquement dans le handler (règle du projet).
- Aucune migration DB, aucun changement de schéma, aucun nouveau secret.
- Le dashboard partage la query `['ncc','dashboard-overview']` entre les deux modules pour un seul appel réseau.
- Les KPI cards du dashboard restent inchangées (déjà branchées sur `getDashboardKpis`, données réelles).

## Vérification
- `rg "mock" src/components/ncc src/routes/ncc*.tsx src/lib/ncc` doit ne plus rien retourner.
- Ouvrir `/ncc` : le graphique reflète les vraies commandes payées, le fil d'activité liste les vrais évènements récents, la cloche liste les vraies notifications.
