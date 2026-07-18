## Objectif
Améliorer la vitesse/fluidité perçue du site, corriger deux avertissements console récurrents, resserrer le SEO et s'assurer que Google reçoit bien le sitemap à jour.

## 1) Performance & fluidité

- **Homepage `src/routes/index.tsx` (~1020 lignes, monolithique)** : passer les sections lourdes hors du fold en `React.lazy` + `<Suspense>` (Testimonials, Downloads, LatestPosts, FAQ, Footer) pour réduire le JS initial et améliorer LCP/TTI mobile.
- **Preload hero** : le préchargement de `heroBg` est déclaré sur la route `/` mais chaque route localisée (`/fr`, `/en`, `/de`) réutilise `NexoraLanding` sans préloader la même image. Ajouter `links: preload` du hero dans `fr.index.tsx`, `en.index.tsx`, `de.index.tsx`.
- **Polices Google Fonts** : actuellement chargées en `<link rel="stylesheet">` bloquant dans `__root.tsx`. Passer en pattern non-bloquant (`media="print"` + `onload="this.media='all'"`) avec fallback `<noscript>` — gain FCP notable mobile.
- **`ResponsiveImage`** : `srcSet` génère 3 descripteurs pointant tous vers la même URL CDN → aucun bénéfice mais coût de parsing. Le simplifier (retirer `srcSet` quand la source n'est pas réellement redimensionnée).
- **Warning console `fetchpriority`** : le `<link rel="preload">` dans `head()` de `index.tsx` utilise `fetchpriority` (minuscule) que React normalise mal en runtime → renommer en `fetchPriority` (camelCase) pour supprimer le warning.
- **Warning code-split `NexoraLanding`** : composant exporté depuis un route file et réutilisé par `fr/en/de.index.tsx`. Extraire `NexoraLanding` dans `src/components/landing/NexoraLanding.tsx` et l'importer depuis les 4 routes → supprime le warning et améliore le splitting.
- **PWA** : conserver la config existante, aucune modification.

## 2) SEO — corrections ciblées

- **`og:image` sur `__root.tsx`** : actuellement défini au niveau root → il écrase les images sociales des routes filles (contre les règles du projet). Le déplacer sur `index.tsx` uniquement (les autres routes reprendront le fallback hosting).
- **`twitter:site` = @Lovable** dans `__root.tsx` : remplacer par un handle Nexora ou supprimer.
- **`hreflang` sur `<link>` dans root** : les `href` sont relatifs (`/fr`, `/en`, `/de`). Google recommande des URL absolues → passer en absolu.
- **Canonical/og:url manquants** sur plusieurs routes publiques (`/catalog`, `/galerie`, `/reseller`, `/track`, `/legal-guide`, pages `/legal/*`). Audit + ajout des `head()` manquants (title unique + description + canonical self-référencé + og:title/og:description).
- **`h1` unique** : vérifier `/` et `/blog` (audit rapide, correction si doublon).
- **Sitemap** : le fichier est bien servi (HTTP 200, `content-type: application/xml`) et inclut la homepage, /fr /en /de, /catalog, /blog, /reseller, articles + catégories dynamiques. Ajouter `/produits/*` (routes marchandes) et `<lastmod>` sur les pages statiques (date de build) pour aider Google à recrawler.

## 3) Google Search Console — sitemap

Le connecteur Search Console n'est pas lié à ce projet (`GOOGLE_SEARCH_CONSOLE_API_KEY` absent). Deux options :

- **Recommandé** : connecter le connecteur Google Search Console pour que je puisse (a) vérifier l'état d'indexation de `nexora-iptv.com`, (b) resoumettre `sitemap.xml` via l'API, (c) inspecter les URLs clés et lister les erreurs de couverture. Si tu confirmes, je déclenche la connexion à l'implémentation.
- **Sans connecteur** : je ne peux que vérifier que le sitemap est accessible (fait : ✅ 200, bien formé) et que `robots.txt` le référence (fait : ✅). La resoumission doit alors être faite manuellement dans ton compte GSC.

## Détails techniques

```text
Fichiers modifiés
├── src/routes/__root.tsx           (fonts non-bloquantes, retrait og:image, twitter:site, hreflang absolus)
├── src/routes/index.tsx            (lazy sections, fetchPriority, og:image ici, import NexoraLanding)
├── src/routes/fr.index.tsx         (preload hero + import NexoraLanding)
├── src/routes/en.index.tsx         (idem)
├── src/routes/de.index.tsx         (idem)
├── src/routes/sitemap[.]xml.ts     (ajout /produits + <lastmod>)
├── src/routes/catalog.tsx | galerie.tsx | reseller.tsx | track.tsx
│                                    (head() canonical + og:url + og:title/desc)
├── src/routes/legal/*.tsx          (head() canonical + og:url)
├── src/components/ResponsiveImage.tsx (srcSet simplifié)
└── src/components/landing/NexoraLanding.tsx (nouveau — extraction)
```

Aucune logique métier, aucun changement backend, aucune migration DB. Tous les changements restent frontend/SEO.

## Question avant implémentation

Souhaites-tu que je **connecte Google Search Console** (option recommandée ci-dessus) pour piloter la resoumission du sitemap et l'audit d'indexation directement depuis l'app ?