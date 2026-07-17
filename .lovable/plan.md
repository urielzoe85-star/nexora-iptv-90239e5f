## Module Blog & CMS pour NEXORA (V1)

Nouveau module intégré au NCC pour rédiger, publier et référencer des articles, plus un blog public `/blog` optimisé SEO. Aucune fonctionnalité existante n'est modifiée.

### 1. Base de données (migration Supabase)

Nouvelles tables `public` (RLS + GRANT complets) :

- `blog_categories` — `slug` (unique), `name`, `description`, `seo_title`, `seo_description`, `sort_order`.
- `blog_tags` — `slug` (unique), `name`.
- `blog_posts` — colonnes clés :
  - contenu : `title`, `slug` (unique par `locale`), `excerpt`, `content_html`, `content_json` (TipTap), `cover_image_url`, `reading_time_min`
  - taxonomie : `category_id`, `author_id` (→ `auth.users`), `locale` (défaut `fr`)
  - SEO : `seo_title`, `seo_description`, `og_image_url`, `canonical_url`, `noindex` (bool), `twitter_card`
  - publication : `status` (`draft` | `scheduled` | `published` | `archived`), `published_at`, `scheduled_at`
  - stats : `view_count`
  - flags futurs : `comments_enabled` (défaut `false`), `translation_of` (uuid nullable pour multilingue futur)
- `blog_post_tags` — table de jonction (`post_id`, `tag_id`).
- `blog_post_images` — galerie multi-images d'un article.
- `blog_comments` — architecture prête (auteur, email, contenu, `status` pending/approved/spam, `parent_id` pour threads). **Aucune UI publique en V1**, uniquement modération future.

Policies :
- Lecture publique (`anon` + `authenticated`) : uniquement `status = 'published'` et `published_at <= now()`.
- Écriture : rôle `admin` uniquement (via `has_role`).
- `blog_comments` : insertion publique désactivée en V1 (feature flag serveur).

Index : `slug`, `status + published_at DESC`, `category_id`, `locale`.

Fonction `blog_publish_scheduled()` (SECURITY DEFINER) + cron `pg_cron` toutes les 5 min pour passer `scheduled` → `published` quand `scheduled_at <= now()`.

### 2. Server functions (`src/lib/blog.functions.ts`)

Admin (`requireSupabaseAuth` + check admin) :
- `adminListPosts` (filtres statut/catégorie/recherche/pagination)
- `adminGetPost`, `adminCreatePost`, `adminUpdatePost`, `adminDeletePost`, `adminDuplicatePost`
- `adminPublishPost`, `adminUnpublishPost`, `adminSchedulePost`, `adminArchivePost`
- CRUD `adminListCategories/createCategory/updateCategory/deleteCategory`
- CRUD `adminListTags/upsertTag`
- `adminUploadImage` (bucket Storage `blog-media`, optimisation via variants tailles)

Public (server-fn sans auth, RLS anon) :
- `publicListPosts({ category?, tag?, search?, page, pageSize })`
- `publicGetPostBySlug(slug)` (+ incrémente `view_count`)
- `publicRelatedPosts(postId)` (même catégorie ou tags communs, 3 items)
- `publicListCategories`, `publicListTags`

### 3. Espace NCC — `/ncc/blog/*`

Nouveau groupe **Contenu** dans `src/lib/ncc/modules.ts` :

- `/ncc/blog` — liste articles (colonnes : titre, statut, catégorie, auteur, vues, dates), filtres, recherche, actions (éditer, dupliquer, publier/dépublier, supprimer).
- `/ncc/blog/new` et `/ncc/blog/:id` — éditeur article :
  - Colonne principale : titre, slug (auto-généré, éditable), **éditeur TipTap** (H1-H3, gras/italique/listes/citations, liens, images, tableaux, blocs info, embed YouTube via extension `iframe`), excerpt.
  - Panneau latéral : statut (brouillon/publié/archivé), planification (`scheduled_at`), catégorie, tags (autocomplete + création à la volée), image de couverture, galerie.
  - Bloc **SEO** : seo_title (compteur ≤60), seo_description (≤160), slug, canonical, OG image, twitter card, noindex/index, **aperçu Google** (SERP snippet en temps réel).
- `/ncc/blog/categories` — CRUD catégories.
- `/ncc/blog/tags` — CRUD tags.
- `/ncc/blog/comments` — placeholder + toggle « Activer les commentaires » (feature flag global, désactivé par défaut).

### 4. Blog public — `/blog/*`

Nouvelles routes TanStack (SSR + `head()` complet) :

- `src/routes/blog.index.tsx` — liste paginée, recherche interne, filtres catégorie/tag, cartes responsives.
- `src/routes/blog.$slug.tsx` — article : hero cover, H1, contenu HTML rendu, métadonnées auteur/date, tags, bloc « Articles similaires » (3), CTA vers l'offre. `head()` complet : title, description, canonical self-référentiel, og:type=article, og:image (cover), twitter card, JSON-LD Article + BreadcrumbList.
- `src/routes/blog.categorie.$slug.tsx` — liste filtrée par catégorie, JSON-LD CollectionPage.
- `src/routes/blog.tag.$slug.tsx` — liste filtrée par tag.

Composants publics dans `src/components/blog/` : `PostCard`, `PostContent` (rendu HTML sanitisé), `RelatedPosts`, `BlogSearch`, `BlogPagination`.

### 5. Images & storage

Bucket `blog-media` (public) via `supabase--storage_create_bucket`. Upload depuis l'éditeur : compression client (WebP), variants tailles générées à la volée par CDN. Alt-text obligatoire (validation zod).

### 6. Sitemap & SEO

`src/routes/sitemap[.]xml.ts` étendu : requête publique des articles publiés + catégories, ajout dynamique de chaque URL avec `lastmod` = `updated_at`. Nouveau `sitemap-blog.xml` si volume élevé (>500 articles) — pas nécessaire en V1.

`robots.txt` : blog public non bloqué (déjà OK).

### 7. Sécurité contenu

- Sanitisation HTML côté serveur avant stockage (`sanitize-html` ou DOMPurify server) : whitelist tags/attrs (pas de `<script>`, `on*`, `javascript:`).
- Validation zod stricte sur toutes les server-fns admin (longueurs, formats).

### 8. Architecture future-proof (préparée, non implémentée V1)

Colonnes/tables en place pour :
- IA (colonne `ai_generated` bool, `ai_prompt` text)
- Multilingue (`locale`, `translation_of`)
- Newsletter (table `blog_subscribers` déclarée mais UI désactivée)
- Stats (`view_count` déjà là, extensible vers `blog_post_views` par jour plus tard)

### Fichiers créés

```text
migrations/          → blog_*, blog_publish_scheduled(), cron
src/lib/blog.functions.ts
src/lib/blog.server.ts         (sanitisation, slugify, reading time)
src/components/ncc/blog/
  ├─ BlogListPage.tsx
  ├─ BlogEditor.tsx            (TipTap + panneau SEO)
  ├─ SeoPanel.tsx              (aperçu Google)
  ├─ CategoryManager.tsx
  └─ TagManager.tsx
src/components/blog/
  ├─ PostCard.tsx
  ├─ PostContent.tsx
  ├─ RelatedPosts.tsx
  └─ BlogSearch.tsx
src/routes/ncc.blog.tsx        (+ .new, .$id, .categories, .tags, .comments)
src/routes/blog.index.tsx
src/routes/blog.$slug.tsx
src/routes/blog.categorie.$slug.tsx
src/routes/blog.tag.$slug.tsx
src/lib/ncc/modules.ts         (ajout groupe Contenu → Blog)
src/routes/sitemap[.]xml.ts    (ajout articles + catégories)
```

### Dépendances npm

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-youtube`, `@tiptap/extension-placeholder`
- `sanitize-html`
- `slugify`
- `reading-time`

### Contraintes respectées

- Aucune route ou fonction existante modifiée (sauf ajouts : sidebar NCC, sitemap).
- Identité visuelle Nexora conservée (tokens, shadcn).
- Blog public entièrement SSR pour Lighthouse/Core Web Vitals.
- Rendu HTML sanitisé, images lazy, preload cover pour LCP article.
