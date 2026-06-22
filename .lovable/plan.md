## Admin Dashboard — Plan

Espace privé `/admin` protégé par authentification email + mot de passe, avec rôle `admin` stocké en base (table dédiée, pas sur le profil — sécurité anti-escalade).

### 1. Authentification & sécurité
- Activation de l'auth email/mot de passe (Lovable Cloud).
- Table `user_roles` + enum `app_role` (`admin`, `user`) + fonction `has_role()` security definer.
- Route `/admin/login` publique (formulaire email + mot de passe).
- Layout protégé `_authenticated/admin` : vérifie session + rôle admin via server function. Redirige vers `/admin/login` sinon.
- Déconnexion propre (clear cache + signOut + redirect).

### 2. Structure du dashboard
Sidebar responsive (shadcn `Sidebar`) avec navigation :
- **Vue d'ensemble** — KPIs (commandes du jour, CA, taux de conversion, commandes en attente) + graphique CA 30 jours.
- **Commandes** — Table paginée, filtres (statut, date, plan), recherche (email/ref), détail commande, actions : marquer payée / activée / échouée / remboursée, copier credentials, renvoyer email.
- **Clients** — Liste des emails clients agrégés depuis `orders`, historique des commandes par client.
- **Plans & tarifs** — CRUD complet sur les plans IPTV (nom, prix, devise, durée, features, actif/inactif, ordre d'affichage). Nouvelle table `plans`.
- **Contenu du site (CMS)** — CRUD sur les sections éditables de la home (hero title/subtitle/CTA, features, FAQ, témoignages). Nouvelle table `site_content` (key/value JSON par section + locale fr/en/de).
- **Administrateurs** — Liste des admins, ajout/retrait du rôle admin par email.
- **Paramètres** — Coordonnées contact, liens sociaux, infos légales, langue par défaut.

### 3. Backend (server functions, RLS strictes)
Toutes les écritures admin passent par `createServerFn` + middleware `requireSupabaseAuth` + vérification `has_role(userId, 'admin')`. Sinon `403 Forbidden`.

Nouvelles tables (toutes avec RLS + GRANTs) :
- `user_roles` (auth-only, lecture via `has_role`).
- `plans` (lecture publique anon, écriture admin uniquement).
- `site_content` (lecture publique anon, écriture admin uniquement).
- `site_settings` (lecture publique anon, écriture admin uniquement).

Mise à jour de la home pour lire `plans` et `site_content` depuis la DB (au lieu de hardcoder) — fallback sur les valeurs actuelles si vide.

### 4. UX
- Design cohérent avec le site (mêmes tokens, mode sombre).
- Toasts pour chaque action (succès/erreur).
- Confirmations destructives (modal) avant suppression.
- Loading states & skeletons.
- Empty states clairs.
- i18n FR (langue principale de l'admin).

### 5. Premier admin
Création du premier compte admin : page `/admin/login` propose un onboarding "Créer le premier admin" tant qu'aucun admin n'existe (vérifié côté serveur). Au-delà, signup désactivé sur l'admin — seuls les admins existants peuvent en ajouter d'autres.

### Détails techniques
- Stack : TanStack Start + Lovable Cloud (Supabase).
- Routes : `src/routes/admin.login.tsx`, `src/routes/_authenticated/admin/*` (overview, orders, clients, plans, content, admins, settings).
- Composants : `src/components/admin/AdminSidebar.tsx`, tables avec `@tanstack/react-table` (déjà dispo via shadcn), formulaires `react-hook-form` + `zod`.
- Server fns : `src/lib/admin.functions.ts` (CRUD orders/plans/content/settings/admins), toutes gated par `requireSupabaseAuth` + check `has_role`.
- Graphiques : `recharts` (déjà inclus avec shadcn).

### Hors scope (sauf demande)
- Multi-tenant / multi-sites.
- Workflow d'approbation / brouillons CMS.
- Logs d'audit détaillés (peut être ajouté ensuite).
- Import/export CSV en masse.
