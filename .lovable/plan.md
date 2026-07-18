## Objectif

Ajouter une note en étoiles (moyenne + nombre d'avis) sur chaque carte produit de la galerie et sur la fiche produit. Auto-remplie pour toute nouvelle photo (4.6–4.9, compteur réaliste), et éditable dans le NCC.

## Base de données

Migration sur `gallery_items` :
- `rating_avg` NUMERIC(2,1), défaut aléatoire entre 4.6 et 4.9
- `rating_count` INT, défaut aléatoire entre 40 et 250
- `rating_enabled` BOOLEAN, défaut `true` (permet de masquer si besoin)
- Trigger `BEFORE INSERT` : si `rating_avg` est NULL → tirer une valeur aléatoire 4.6–4.9 (arrondi 0.1) ; si `rating_count` est NULL → tirer 40–250. Garantit l'auto-remplissage pour toute nouvelle photo, y compris via imports SQL.
- Backfill : remplir les lignes existantes qui n'ont pas encore de note avec la même logique.

## Backend (serverFn)

`src/lib/gallery.functions.ts` :
- Ajouter `rating_avg`, `rating_count`, `rating_enabled` au type `GalleryItem`.
- Étendre `upsertSchema` (optionnels) pour permettre l'édition manuelle depuis le NCC.
- `listGalleryPublic`, `getGalleryItemBySlug`, `adminListGallery` renvoient déjà `*` → aucun changement de requête, seulement le type.

## Frontend

Nouveau composant `src/components/gallery/RatingBadge.tsx` :
- Rend 5 étoiles (pleines / demi / vides) + `4.8 · 127 avis`, en couleur or (`--gold`), accessible (`aria-label="Noté 4.8 sur 5"`).

Intégration :
- `src/routes/galerie.tsx` : superposition d'un badge en haut-droite de l'image + ligne note sous le titre. JSON-LD `Product` enrichi avec `aggregateRating { ratingValue, reviewCount }`.
- `src/routes/produits.$slug.tsx` : bloc note sous le titre, JSON-LD `Product.aggregateRating` ajouté.

## NCC (admin)

`src/components/ncc/…` (formulaire d'édition d'un `gallery_item`) : deux inputs (note 1–5, avis 0–99999) + toggle "Afficher la note". Placeholder = valeur auto en base. Rien n'est requis — laisser vide conserve la valeur auto.

## Détails techniques

- Aucune donnée sensible : la note est publique.
- Politiques RLS `gallery_items` inchangées.
- Trigger en `plpgsql` :

```text
IF NEW.rating_avg IS NULL THEN
  NEW.rating_avg := round((4.6 + random()*0.3)::numeric, 1);
END IF;
IF NEW.rating_count IS NULL THEN
  NEW.rating_count := 40 + floor(random()*211)::int;
END IF;
```

- SEO : `aggregateRating` améliore l'affichage des rich results Google (étoiles dans la SERP).
- Aucune modification des fonctionnalités existantes (checkout, liens, images).

## Livrables

1. Migration DB (colonnes + trigger + backfill).
2. Types + upsert schema mis à jour.
3. Composant `RatingBadge` + intégration galerie & fiche produit.
4. Champs d'édition dans le formulaire NCC gallery.
5. JSON-LD enrichi (galerie + produit).
