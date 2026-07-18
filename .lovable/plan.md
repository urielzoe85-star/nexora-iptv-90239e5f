## Objectif

Enrichir le balisage schema.org sur le blog pour améliorer l'indexation et les rich snippets Google (dates, auteur, fil d'Ariane, image, catégorie).

## État actuel

- `/blog/$slug` a déjà un JSON-LD `Article` basique (headline, image, dates, author, publisher).
- `/blog` et `/blog/categorie/$slug` n'ont **aucun** JSON-LD.
- Pas de `BreadcrumbList`, pas de `mainEntityOfPage` typé, pas de `wordCount`, `keywords`, `articleSection`, ni `inLanguage`.

## Ce que je vais faire

### 1. `src/routes/blog.$slug.tsx` — enrichir le schéma article

- Passer `@type` de `Article` à **`BlogPosting`** (plus précis, mieux compris par Google).
- Corriger `mainEntityOfPage` en objet typé : `{ "@type": "WebPage", "@id": url }`.
- Ajouter :
  - `inLanguage: "fr-FR"`
  - `url` (canonical de l'article)
  - `keywords` (à partir de `p.tags` si dispo, sinon `seo_keywords`)
  - `articleSection` (nom de la catégorie principale si dispo)
  - `wordCount` (calculé côté serveur à partir du contenu HTML nettoyé)
  - `author` enrichi avec `url` si `author_url` existe
  - `publisher.logo` avec `width`/`height`
  - Objet `image` typé `ImageObject` avec dimensions par défaut si connues
- Ajouter un **second script JSON-LD `BreadcrumbList`** : Accueil › Blog › [Catégorie] › Article.

### 2. `src/routes/blog.index.tsx` — ajouter JSON-LD

Deux blocs `application/ld+json` :
- **`Blog`** avec `name`, `description`, `url`, `publisher`, et `blogPost[]` (les articles chargés côté loader, ou top 10).
- **`BreadcrumbList`** : Accueil › Blog.

### 3. `src/routes/blog.categorie.$slug.tsx` — ajouter JSON-LD

- **`CollectionPage`** avec `mainEntity` = `ItemList` des articles de la catégorie.
- **`BreadcrumbList`** : Accueil › Blog › Catégorie.

### 4. Support backend (si nécessaire)

- Vérifier que `publicGetPost` renvoie déjà `tags`, `category`, `content` bruts pour calculer `wordCount` et `keywords`. Si non, étendre le retour dans `src/lib/blog.functions.ts` (champs additionnels seulement, aucune régression).
- Ajouter un helper `computeWordCount(html)` dans `src/lib/blog.server.ts` (strip HTML + split whitespace).

## Détails techniques

- Tout reste **SSR-safe** : JSON-LD injecté via l'API `head().scripts` de TanStack Start (déjà en place).
- Aucune modif visuelle, aucun changement de logique métier.
- URLs absolues `https://nexora-iptv.com/...` conformes aux règles du projet.
- Zéro impact sur les pages hors blog.

## Vérification

Après build : contrôler avec l'outil Google Rich Results Test sur un article publié et sur `/blog`.
