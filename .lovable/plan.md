# Régénération automatique du sitemap après changement de slug

## Objectif
Quand un slug d'article change (édition CMS, redirection, publication), le sitemap.xml, le flux RSS et les caches doivent se rafraîchir immédiatement — sans attendre l'expiration du cache de 5 minutes — pour que Google et les navigateurs récupèrent toujours la bonne URL.

## Changements

### 1. Invalidation de cache pilotée par la base
- Ajouter une petite table `public.sitemap_cache_state` (une seule ligne) avec un champ `updated_at`, protégée en écriture par RLS (service_role uniquement).
- Dans `src/lib/blog.functions.ts`, chaque fois qu'un slug ou statut change (`adminCreatePost`, `adminUpdatePost` — déjà en place pour la redirection —, `adminDeletePost`, changement de `status` published/scheduled), mettre à jour `updated_at = now()` via `supabaseAdmin`.

### 2. Sitemap & RSS "always-fresh"
- `src/routes/sitemap[.]xml.ts` et `src/routes/rss[.]xml.ts` :
  - Lire `sitemap_cache_state.updated_at` en tête de handler.
  - Passer le header en `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` + `ETag` basé sur `updated_at`.
  - Répondre `304 Not Modified` si l'`If-None-Match` du client correspond.
- Effet : Google et les navigateurs revalident à chaque requête ; dès qu'un slug change, l'ETag change et ils récupèrent la nouvelle version.

### 3. Ping automatique des moteurs
- Nouvelle server function `pingSearchEngines()` (fire-and-forget) qui, après un changement de slug, appelle :
  - `https://www.google.com/ping?sitemap=https://nexora-iptv.com/sitemap.xml`
  - `https://www.bing.com/ping?sitemap=https://nexora-iptv.com/sitemap.xml`
- Déclenchée depuis `adminUpdatePost` / `adminCreatePost` / `adminDeletePost` sans bloquer la réponse (échec silencieux loggé).

### 4. Rafraîchissement côté client
- Le composant `/blog` (déjà en polling 30 s) écoute déjà `blog_posts` ; aucune modif nécessaire.
- Ajouter un `router.invalidate()` dans l'admin CMS après save pour purger le cache TanStack Query des articles.

## Détails techniques

```text
adminUpdatePost(slug change)
  ├─ insert into blog_post_redirects (déjà fait)
  ├─ update sitemap_cache_state set updated_at = now()   ← nouveau
  └─ fire-and-forget pingSearchEngines()                 ← nouveau

GET /sitemap.xml
  ├─ read sitemap_cache_state.updated_at → ETag
  ├─ if If-None-Match match → 304
  └─ else → 200 + Cache-Control: max-age=0, s-maxage=60, SWR=300
```

## Hors périmètre
- Pas de changement des URLs existantes ni du contenu du sitemap.
- Pas de modification du système de redirections 301 déjà en place.
- Pas de touche à `og:image`, robots.txt, ou à la structure des routes.
