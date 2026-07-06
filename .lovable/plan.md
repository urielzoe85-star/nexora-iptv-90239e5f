# Galerie photo produits — Plan

## Objectif
Ajouter une galerie photo publique alimentée depuis l'admin NCC. Chaque image est cliquable vers un plan IPTV (ancre `#pricing-<slug>`) ou une page produit dédiée, avec balisage SEO compatible Google Merchant Center.

## 1. Base de données (Lovable Cloud)

**Nouvelle table `gallery_items`**
- `id`, `title`, `description`, `sort_order`, `active`, timestamps
- `image_url` (URL finale affichée) + `image_source` (`upload` | `external`)
- `link_type` (`plan` | `product_page` | `external_url`)
- `plan_slug` / `product_slug` / `external_url` (selon type)
- Champs SEO Merchant : `price`, `currency`, `sku`, `brand`, `availability`
- RLS : SELECT anon si `active=true` ; ALL admin via `has_role`
- GRANTs standard (anon SELECT, authenticated/service_role)

## 2. Storage
- Bucket `gallery` (privé) via `supabase--storage_create_bucket`
- Policies `storage.objects` : lecture publique, écriture admin uniquement

## 3. Server functions (`src/lib/gallery.functions.ts`)
- `listGalleryPublic()` — anon, items actifs
- `adminListGallery()` — admin
- `adminUpsertGalleryItem()` — création/édition
- `adminDeleteGalleryItem()`
- `adminUploadGalleryImage()` — upload fichier → bucket, retourne URL publique

## 4. Admin NCC — `/ncc/gallery`
Page CRUD (pattern `admin.plans.tsx`) :
- Tableau : miniature, titre, cible, prix, statut, ordre, actions
- Dialog édition avec **2 onglets** pour l'image :
  - **Upload** : input file → Lovable Cloud Storage
  - **URL externe** : coller une URL
- Sélecteur type de lien : plan (dropdown des plans actifs) / page produit (slug libre) / URL libre
- Champs SEO : SKU, marque, prix, devise, disponibilité
- Ajout dans sidebar NCC (icône `Images`, groupe `sales`)

## 5. Page publique `/galerie`
- Grille responsive
- Chaque carte : image + titre + prix + CTA "Voir l'offre"
- Clic → `/#pricing-<slug>` OU `/produits/<slug>` OU URL externe
- Head SEO : title, description, canonical, og:image (première image)
- JSON-LD `ItemList` de `Product`

## 6. Pages produit `/produits/$slug`
- Route dynamique, loader lit `gallery_items` par `product_slug`
- Hero image + description + prix + bouton achat (checkout ou WhatsApp)
- JSON-LD `Product` complet (Merchant compatible)
- Head OG dynamique (og:image = image produit, self-referencing canonical)

## 7. Ancres plans
- Ajouter `id="pricing-<slug>"` sur chaque carte plan de la home
- Permet le scroll depuis la galerie

## 8. SEO / Google Merchant
- JSON-LD `Product` par page produit + `ItemList` sur `/galerie`
- **Flux XML Merchant** : route publique `src/routes/api/public/merchant-feed.xml.ts` générant un feed Google Shopping (title, description, link, image_link, price, availability, brand, condition) depuis `gallery_items` actifs
- Ajout `/galerie` et `/produits/*` au sitemap
- Lien `<link rel="alternate" type="application/xml">` vers le feed

## 9. Navigation
- Lien "Galerie" dans header public
- CTA croisés galerie ↔ pricing

## Livrables
1. Migration DB (table + RLS + GRANTs)
2. Bucket Storage + policies
3. `src/lib/gallery.functions.ts`
4. `src/routes/ncc.gallery.tsx` (admin)
5. `src/routes/galerie.tsx` (public)
6. `src/routes/produits.$slug.tsx` (produit)
7. `src/routes/api/public/merchant-feed.xml.ts`
8. Sidebar NCC + header public + ancres pricing
