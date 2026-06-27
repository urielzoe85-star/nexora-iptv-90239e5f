# Import MEGAOTT depuis Essais / Premium / Comptes IPTV

## Contexte

Le fichier joint (`subscriptions 2026-06-27 …xlsx`) correspond exactement au format MEGAOTT déjà géré par `/ncc/iptv/import` : colonnes `Username, Password, Mac, Code, Type, Owner, Package, DNS, Paid, Trial, Expiration Date, Max Connections, Forced Country, Enabled, Admin Enabled, Last Login, Last IP, Reseller Notes, Admin Notes, Created At`. Aucun changement de parsing n'est nécessaire — il faut juste **rendre l'import accessible depuis les trois écrans** Essais gratuits, Premium et Comptes IPTV.

## Note importante sur le "dossier Téléchargements"

Pour des raisons de sécurité, **un navigateur ne peut pas forcer l'ouverture d'un dossier précis** (ex : `C:\Users\…\Downloads`). Le sélecteur natif ouvre soit le dernier dossier utilisé, soit, à la première utilisation, le dossier Téléchargements de l'OS (comportement par défaut Windows/macOS). Je vais donc :
- déclencher le sélecteur de fichiers natif (`<input type="file" accept=".xlsx,.xls,.csv">`),
- l'OS l'ouvrira sur Téléchargements la 1re fois et conservera ensuite le dernier dossier,
- aucun chemin codé en dur (impossible côté web).

## Plan d'implémentation

### 1. Nouveau composant partagé `MegaottImportButton`
Fichier : `src/components/ncc/iptv/MegaottImportButton.tsx`
- Bouton `Importer XLSX` (icône `Upload`).
- Au clic → ouvre un `<input type="file" hidden>` (accept `.xlsx,.xls,.csv`).
- À la sélection :
  - lit le fichier en base64,
  - appelle `parseIptvImportFile` puis directement `commitIptvImport` (stratégie `update` par défaut, format auto),
  - toasts succès/erreur (créés / mis à jour / ignorés),
  - invalide `["iptv"]` pour rafraîchir KPIs et listes.
- Props : `defaultDedupe?: "skip" | "update"`, `onDone?: () => void`.
- Réutilise les server-functions existantes — aucune logique métier dupliquée.

### 2. Intégration dans les trois pages
Ajouter le bouton dans l'en-tête / barre d'actions :
- `src/routes/ncc.iptv.accounts.tsx` → passer un slot d'action à `AccountsView` (ou wrapper local).
- `src/routes/ncc.iptv.trials.tsx` → à côté des filtres existants.
- `src/routes/ncc.iptv.premium.tsx` → idem.

Le bouton importe **tous** les comptes du fichier MEGAOTT ; le filtrage Trial/Premium se fait ensuite naturellement via les colonnes `Trial` / `Paid` déjà mappées.

### 3. Aucune modification
- Pas de changement DB, ni de server-functions, ni de SebPay, ni du Front Office.
- La page `/ncc/iptv/import` (wizard détaillé avec aperçu) reste inchangée pour les imports volumineux.

## Résultat attendu

Sur `Essais gratuits`, `Premium`, `Comptes IPTV` : un bouton **Importer XLSX** ; un clic ouvre le sélecteur de fichiers (Téléchargements par défaut), l'utilisateur choisit l'export MEGAOTT, l'import s'exécute en un clic avec dédoublonnage par `Username`.
