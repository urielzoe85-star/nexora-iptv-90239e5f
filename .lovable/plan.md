
# Activation Journal · Analytics · Support · Employés

## Journal système (`/ncc/logs`)

Brancher la table existante `security_events` (+ agrège `automation_runs` et `iptv_logs` récents en source unifiée).

- Server fn `getSystemLogs({search, severity, source, limit})` (requireAdmin) — fusionne les 3 sources en `{ ts, severity, source, message, actor, ref }`, tri desc, limite 200.
- Remplacer `LogsTable.tsx` par un tableau live (search, filtre severity, filtre source, bouton "Rafraîchir" et export CSV).
- Retirer le badge "Collecte à venir" de la page.

## Analytics (`/ncc/analytics`)

Vue KPI sur 30 j depuis `orders`, `customers`, `subscriptions`.

- Server fn `getAnalyticsSnapshot({ days: 7|30|90 })` (requireAdmin) : revenu total, nb commandes, panier moyen, taux de conversion (paid/total), nouveaux clients, abonnements actifs, top plans, série journalière (revenu + orders).
- Page dédiée : 4 stat cards + graph (recharts, déjà utilisé) + top plans + selecteur période.
- Statut du module → `ready`.

## Support (`/ncc/support`) — mini helpdesk

Migration :
- `support_tickets` (id, customer_id nullable, email, subject, status: `open|pending|resolved|closed`, priority: `low|normal|high|urgent`, assigned_to nullable, last_message_at, created_at, updated_at)
- `support_messages` (id, ticket_id, author_type: `customer|admin`, author_user_id nullable, body, created_at)
- GRANT + RLS : admins (has_role) full ; `authenticated` : lit/écrit uniquement ses propres tickets via customer_id/email.

Server fns (requireAdmin) : list, get(id), createTicket, addMessage, updateStatus, assign.
UI : liste (filtres statut/priorité) + drawer/route détail avec fil de messages et actions rapides.
Statut → `ready`. Pas encore de portail client (à voir plus tard).

## Employés (`/ncc/employees`) — gestion des admins

Utilise `user_roles` existant + `admin_change_role` RPC.

Server fns (requireAdmin) :
- `listEmployees()` : join `auth.users` (via supabaseAdmin) × `user_roles`, retourne email, dernière connexion, rôle.
- `inviteEmployee({email, role})` : `supabaseAdmin.auth.admin.inviteUserByEmail` puis insert `user_roles`.
- `grantAdmin({user_id})` / `revokeAdmin({user_id})` : appelle `admin_change_role` (déjà safe, empêche perte du dernier admin).

UI : tableau + bouton Inviter (dialog email + role) + toggle admin par ligne + confirmation. Statut → `ready`.

## Divers

- `modules.ts` : passer `logs`, `analytics`, `support`, `employees` à `status: "ready"`.
- Ajouter un log Telegram admin (best-effort) sur `inviteEmployee` et `grantAdmin/revokeAdmin` (déjà loggé côté security_events par `admin_change_role`, on garde la notif).

## Technique

- Toutes les server fns dans `src/lib/{logs,analytics,support,employees}.functions.ts` avec `requireAdmin`.
- Charts : `recharts` (déjà dans `package.json`).
- Migration Support unique : CREATE TABLE + GRANT authenticated/service_role + RLS + policies (admin via `has_role`, client via `auth.uid()`/email match).
- Aucun changement front public.

Ordre d'implémentation : Logs → Analytics → Employés → Support (Support = plus lourd car migration + drawer).
