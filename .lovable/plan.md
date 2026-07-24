## Objectif
Réorganiser **NCC → IPTV Manager** autour des vrais abonnements Nexora, avec un pool dédié par durée, un import CSV/XLSX au format MegaOTT par onglet, et une vue "Clients actifs" enrichie des données MegaOTT. Aucune duplication : un compte n'apparaît que dans l'onglet correspondant à son `package`.

## Nouvelle barre d'onglets
Ordre exact dans `src/routes/ncc.iptv.tsx` :

1. **Dashboard** — KPIs (conservé)
2. **Essai gratuit** — `account_type=trial` (package `24 Hours`)
3. **Premium 1 Mois** — `package=1 Month`
4. **Premium 3 Mois** — `package=3 Months`
5. **Premium 6 Mois** — `package=6 Months`
6. **Premium 12 Mois** — `package=1 Year`
7. **Clients actifs** *(nouveau)* — comptes assignés à un client, vue enrichie MegaOTT
8. **Renouvellements** — expiration ≤ 7 j (conservé, transverse)
9. **Fournisseurs** — MegaOTT & autres (conservé)
10. **Historique imports** — traçabilité des uploads (conservé)

Onglets supprimés (redondants) : Import (fusionné dans chaque onglet plan), Inventaire, Comptes IPTV, Suspendus, Expirés, Abonnements, API Debug. Les routes disparaissent du menu ; le composant `AccountsView` reste réutilisé.

## Filtrage & non-duplication
- Chaque onglet plan filtre strictement sur `account_type` **ET** `package` (ex. « Premium 1 Mois » = `account_type=premium AND package='1 Month'`). Un compte trial n'apparaît donc jamais dans un onglet premium et inversement.
- Ajout du filtre `package` dans le validateur Zod de `listAccounts` (`src/lib/iptv.functions.ts`) — valeurs autorisées : `24 Hours`, `1 Month`, `3 Months`, `6 Months`, `1 Year`.
- Onglet **Clients actifs** = `status IN ('assigned','active') AND customer_id IS NOT NULL` toutes durées confondues.

## Import CSV / XLSX / XLS au format MegaOTT
Un uploader par onglet plan (composant `MegaottImportCard`), pré-verrouillé sur `account_type` + `package` de l'onglet — impossible d'importer un fichier « 6 Months » depuis l'onglet 1 Mois.

Parser (nouveau `src/lib/iptv-megaott-parser.server.ts`) :
- Détecte et ignore `sep=;` puis parse en **CSV point-virgule guillemet-échappé** (RFC 4180 léger).
- XLSX/XLS : lecture via `xlsx` (SheetJS) — première feuille, mêmes colonnes.
- Colonnes reconnues : `Type, Username, Password, MAC, Code, Owner, Package, DNS, Portal, Paid, Enabled, Admin Enabled, Auto Extend, Max Connections, Expiration Date, Last Login, Created At, Admin Notes, Reseller Notes`.
- Mapping vers `iptv_accounts` : `username, password, mac, code, owner, package, dns_link→DNS, portal_link, paid, enabled, admin_enabled, max_connections, expires_at←Expiration Date, last_login, source_created_at←Created At, admin_notes, reseller_notes, account_type=trial|premium selon l'onglet`.
- **Garde-fou serveur** : si `Package` du fichier ≠ `package` attendu par l'onglet → ligne rejetée avec message clair (rapport `{inserted, skipped, errors[]}`).
- **Anti-doublon** : upsert sur `(provider_id, lower(username))` (index déjà présent) — les lignes déjà en base sont mises à jour, pas dupliquées. Rapport distinct `inserted` vs `updated`.
- Server function : refonte de `importAccountsCsv` en `importMegaottAccounts({ file, account_type, package })`, ré-utilisée par les 5 onglets.

## Vue "Clients actifs"
Nouvelle route `src/routes/ncc.iptv.clients.tsx` + composant `ActiveClientsView` :
- Table : Client (email + nom depuis `customers`), Plan (`package`), Username, DNS, Portal, Max connexions, Dernière connexion, IP, Expire le, Statut, Fournisseur, MegaOTT ID.
- Recherche par email / username / package. Export CSV du sous-ensemble filtré.
- Actions : Suspendre, Renouveler (+30/90/180/365 j selon plan), Voir fiche client.

## Menu latéral
`src/lib/ncc/modules.ts` : rien à changer (l'entrée « IPTV Manager » reste unique) ; seul l'ordre/label des onglets internes évolue via `ncc.iptv.tsx`.

## Détails techniques
- **Migration** : aucune (colonnes `package`, `mac`, `code`, `owner`, `paid`, `enabled`, `admin_enabled`, `max_connections`, `dns_link`, `portal_link`, `last_login`, `source_created_at`, `admin_notes`, `reseller_notes` existent déjà).
- **Dépendance** : ajout `xlsx` (SheetJS community) — parsing pur JS, compatible Worker SSR.
- **Sécurité** : `importMegaottAccounts` reste derrière `requireNccUnlock` (admin) ; taille fichier max 5 Mo.
- **Backfill léger** : un script one-shot (via `supabase--insert`) pour renseigner `account_type='trial'` sur les comptes `package='24 Hours'` actuels si besoin — sinon rien à toucher (les données actuelles sont cohérentes d'après l'inventaire).

## Fichiers touchés
- `src/routes/ncc.iptv.tsx` (barre d'onglets)
- `src/routes/ncc.iptv.trials.tsx` → renommé sémantiquement en « Essai gratuit », filtre `package='24 Hours'`
- `src/routes/ncc.iptv.premium.tsx` → supprimé, remplacé par 4 routes : `ncc.iptv.premium-1m.tsx`, `-3m`, `-6m`, `-12m`
- `src/routes/ncc.iptv.clients.tsx` *(nouveau)*
- Suppression : `ncc.iptv.accounts.tsx`, `.inventory.tsx`, `.suspended.tsx`, `.expired.tsx`, `.subscriptions.tsx`, `.import.tsx`, `.debug.tsx`
- `src/components/ncc/iptv/AccountsView.tsx` : accepte `package` dans `filter` + slot `<MegaottImportCard />`
- `src/components/ncc/iptv/MegaottImportCard.tsx` *(nouveau)*
- `src/components/ncc/iptv/ActiveClientsView.tsx` *(nouveau)*
- `src/lib/iptv.functions.ts` : ajout filtre `package`, refonte `importAccountsCsv` → `importMegaottAccounts`, ajout `listActiveClients`
- `src/lib/iptv-megaott-parser.server.ts` *(nouveau)*
- `package.json` : `+ xlsx`

## Vérifications finales
- Build + typecheck.
- Test d'import réel avec le fichier `subscriptions-20260627-130506.csv` fourni (onglet 6 Mois) : garde-fou `Package` OK, 3 lignes attendues insérées, 7 rejetées avec motif clair.
- Vérifier qu'un compte trial n'apparaît dans aucun onglet Premium et vice-versa.