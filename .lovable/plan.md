## Diagnostic

Les articles publiés sont bien en ligne (HTTP 200 sur `/blog/<slug>`), mais leur champ **`canonical_url`** pointe vers un slug différent de celui réellement stocké. Résultat : les liens partagés (boutons Partager, `og:url`, résultats Google) mènent vers une URL qui n'existe pas → **"Page introuvable"**.

Exemples réels en base :

| Slug réel (fonctionne) | canonical_url (404) |
|---|---|
| `best-iptv-for-sports-in-2026-watch-live-games-without-cable` | `/blog/best-iptv-for-sports-2026` |
| `how-to-install-iptv-on-fire-tv-stick-2026-guide-nexora-iptv` | `/blog/how-to-install-iptv-on-fire-tv-stick` |
| `best-iptv-service` | `/blog/best-iptv-service` (ok) |
| `why-more-americans-choose-iptv-2026` | `/blog/why-more-americans-choose-iptv-2026` (ok) |

## Correctifs

### 1. Aligner les slugs sur les canonical_url courts (meilleur SEO)
Renommer les 2 slugs longs pour qu'ils correspondent à leur canonical déjà indexée par Google :
- `best-iptv-for-sports-in-2026-watch-live-games-without-cable` → `best-iptv-for-sports-2026`
- `how-to-install-iptv-on-fire-tv-stick-2026-guide-nexora-iptv` → `how-to-install-iptv-on-fire-tv-stick`

### 2. Table de redirection `blog_post_redirects`
Créer une petite table (old_slug → post_id) + insérer automatiquement l'ancien slug lors de chaque renommage. Le loader `/blog/$slug` cherche d'abord le post ; si absent, consulte la table et **redirige en 301** vers le nouveau slug. Ainsi tout lien déjà partagé (ancien slug ou canonical inversé) fonctionnera à jamais.

### 3. Garde-fou dans l'éditeur admin
Dans `adminUpdatePost` : quand le slug change, insérer automatiquement l'ancien slug dans `blog_post_redirects`.
Dans l'UI admin, avertir si `canonical_url` saisi ne correspond pas au slug local (avec bouton "Aligner").

### 4. Bouton "Copier le lien" et partages
Toujours partager `https://nexora-iptv.com/blog/<slug>` (URL réelle), pas `canonical_url` non vérifiée. Le canonical reste dans le `<head>` pour Google mais n'est plus utilisé côté client pour les liens.

### 5. Purge des caches
- Bump du sitemap + revalidation
- Vider le cache Service Worker PWA sur les routes `/blog/*` (les visiteurs récurrents pouvaient recevoir une vieille version HTML mise en cache)

## Détails techniques

- Migration SQL : `create table public.blog_post_redirects (old_slug text primary key, post_id uuid references blog_posts on delete cascade, created_at timestamptz default now());` + GRANT + RLS (SELECT public).
- Update SQL immédiat pour les 2 slugs cassés + insertion des anciens slugs comme redirects.
- `src/routes/blog.$slug.tsx` loader : si `publicGetPost` renvoie `null`, appeler `publicResolveSlugRedirect` ; si trouvé, `throw redirect({ to: '/blog/$slug', params: { slug: newSlug }, statusCode: 301 })` ; sinon `throw notFound()`.
- `src/lib/blog.functions.ts` : ajouter `publicResolveSlugRedirect(old_slug)`, et faire écrire automatiquement l'ancien slug dans `adminUpdatePost` quand `slug` change.
- `src/routes/blog.$slug.tsx` : `shareUrl` = `https://nexora-iptv.com/blog/${post.slug}` (retirer le `canonical_url ||`).
- `vite.config.ts` PWA : bump `additionalManifestEntries` version pour forcer un `skipWaiting` sur les visiteurs déjà en cache.

Aucune modification du contenu ni de la mise en page des articles.