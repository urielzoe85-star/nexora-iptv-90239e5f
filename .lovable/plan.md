# Nouveau workflow IPTV — Import & Gestion d'inventaire

Bascule du modèle "NEXORA crée dans MEGAOTT" vers "NEXORA gère un inventaire importé depuis MEGAOTT". Les intégrations API MEGAOTT existantes sont conservées mais ne sont plus le chemin principal.

## 1. Schéma base de données (migration)

Étendre `iptv_accounts` (table déjà existante avec username/password/status/expires_at/metadata) avec les champs MEGAOTT :
- `package` (text), `dns_link` (text), `dns_link_samsung_lg` (text), `portal_link` (text)
- `mac_address` (text), `account_type` déjà présent, `max_connections` (int), `notes` (text)
- `megaott_subscription_id` (text, unique partiel), `imported_at` (timestamptz), `import_batch_id` (uuid)
- Étendre l'enum/contrainte de statut : `available`, `reserved`, `assigned`, `delivered`, `expired`, `disabled`
- `order_id` (uuid, FK → orders, nullable, unique partiel sur statuts actifs pour garantir 1 commande active max)

Nouvelles tables :
- `iptv_import_batches` — id, filename, file_format, row_count, created/updated/skipped counts, imported_by (uuid), mapping_snapshot (jsonb), created_at
- `iptv_import_mappings` — id, name, mapping (jsonb { nexora_field: source_column }), is_default, created_by, created_at — pour réutiliser un mapping

GRANT + RLS (lecture/écriture admin via `has_role(auth.uid(),'admin')`, service_role full).

## 2. Server functions (`src/lib/iptv-import.functions.ts`)

- `parseIptvImportFile({ filename, base64, format })` → renvoie `{ headers, sampleRows, totalRows }` (parsing CSV via `papaparse`, XLS/XLSX via `xlsx` SheetJS). Pas d'écriture DB.
- `commitIptvImport({ batch_filename, mapping, rows, dedupe_strategy })` → insère/upsert dans `iptv_accounts` (clé de dédup : `megaott_subscription_id` sinon `username`), crée un `iptv_import_batches`, renvoie compteurs.
- `listImportMappings()`, `saveImportMapping({ name, mapping, is_default })`, `deleteImportMapping(id)`.
- `listImportBatches({ page })`.
- `assignIptvAccountToOrder({ order_id, account_id })` — vérifie disponibilité, passe statut `assigned`, met `metadata.iptv_delivery` cohérent avec `IptvDeliveryCard` existant.
- `releaseIptvAccount({ account_id })`.
- `iptvInventoryKpis()` — counts par statut/package/type.

Toutes protégées par `requireSupabaseAuth` + `has_role admin`. `supabaseAdmin` chargé via `await import` dans le handler.

## 3. UI — nouvelles routes (sous `/ncc/iptv`)

Ajouter onglets dans `src/routes/ncc.iptv.tsx` : **Import**, **Inventaire** (renomme/clarifie l'existant), **Historique d'imports**.

- `src/routes/ncc.iptv.import.tsx` — Assistant 3 étapes :
  1. **Upload** (dropzone CSV/XLS/XLSX, lit fichier en base64 client-side).
  2. **Mapping** — table 2 colonnes : champ NEXORA ↔ colonne source (select). Charger mapping sauvegardé. Bouton "Enregistrer ce mapping".
  3. **Preview & commit** — 10 premières lignes mappées, choix stratégie dédup (skip / update), bouton "Importer".
  Toast résultat avec compteurs.

- `src/routes/ncc.iptv.inventory.tsx` (ou enrichir `AccountsView`) — tableau filtrable par package / type / statut / date d'expiration, KPIs en haut (cards), recherche username.

- `src/routes/ncc.iptv.history.tsx` (existe déjà — étendre) — liste des batches d'import, qui, quand, fichier, counts.

## 4. Attribution depuis une commande

Dans `src/components/ncc/orders/IptvDeliveryCard.tsx` (et la page `ncc.orders.$id.tsx`) :
- Quand `delivery == null` ET commande payée : remplacer le bouton "Créer abonnement MEGAOTT" par **"Affecter un abonnement"** qui ouvre un dialog listant les `iptv_accounts` `status=available` (search par username/package).
- Sélection → appelle `assignIptvAccountToOrder`, le hook `iptv_delivery` dans `orders.metadata` est rempli depuis le compte → la carte affiche déjà Username/Password/Package/Expiration/DNS/Portal.
- Garder l'ancien flow "Créer dans MEGAOTT + form manuel" en option repliée ("Mode legacy MEGAOTT") pour ne rien casser.
- Boutons Email/WhatsApp/Telegram restent (déjà en place via `markIptvDeliverySent`).

## 5. Dépendances

`bun add papaparse xlsx @types/papaparse` — parsing 100% côté serverFn pour rester compatible Worker (xlsx fonctionne en pure JS).

## 6. Contraintes respectées

- SebPay / Front Office : aucun changement.
- Connecteur `iptv.megaott` et `iptv-megaott.functions.ts` : conservés intacts. Le code d'attribution n'appelle plus l'API distante par défaut.
- Workflows automation IPTV existants : inchangés.

## Détails techniques

- Parsing fichier : envoyer le fichier en base64 dans `parseIptvImportFile` (limite raisonnable ~5 MB) ; XLSX via `XLSX.read(buffer, { type:'array' })`.
- Dédup : `ON CONFLICT (megaott_subscription_id)` quand présent, sinon match par `username`. Stratégie `skip` ou `update` choisie côté UI.
- Unicité commande active : index partiel `UNIQUE (order_id) WHERE status IN ('assigned','delivered')`.
- Mapping snapshot stocké dans `iptv_import_batches.mapping_snapshot` pour audit.
- Permissions : tout sous middleware admin ; aucune exposition `anon`.
