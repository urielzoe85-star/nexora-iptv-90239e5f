## Diagnostic

Le site charge lentement principalement à cause des **images "3D features"** de la section *Pourquoi choisir Nexora* : 6 PNG de **~900 Ko – 1.1 Mo chacune** (≈ **5.7 Mo au total**) servies pour être affichées à… **80 × 80 px**. C'est le principal poids inutile.

Points secondaires détectés :
- `devices-main.jpg` (image du salon) chargée en pleine résolution 1344×768 alors que l'écran mobile fait 428 px de large.
- `heroBg` (fond hero, marqué `loading="eager"` + `fetchPriority="high"`) : bon en principe mais à vérifier qu'il n'est pas trop lourd.
- Aucune préconnexion vers le CDN d'images `/__l5e/`.
- Les images des cartes "Downloads" (768×768 servies en 400×192) sont un peu surdimensionnées.
- Les articles blog utilisent des URLs signées Supabase sans dimensions ni `loading="lazy"` uniforme.

## Ce que je vais faire

### 1. Régénérer les 6 icônes 3D "features" — gain ≈ 5.5 Mo
Créer de nouvelles images **256×256 PNG transparentes** (au lieu de 1024+ px opaques) dans le même style 3D doré/navy, avec `imagegen`. Remplacer les 6 `.asset.json` pointeurs. C'est le fix qui aura le plus d'impact perceptible.

### 2. Réduire le poids de l'image "devices-main" sur mobile
Comme c'est une image CDN unique sans variantes multi-résolution, ajouter un vrai `srcset` n'apporte rien (le CDN ne redimensionne pas). À la place :
- Sur mobile, masquer la grande image et n'afficher que la grille des 7 vignettes (déjà petites).
- Sur desktop garder l'image mais avec `loading="lazy"` + `decoding="async"` (déjà en place via `ResponsiveImage`).

### 3. Preconnect + preload
Dans `src/routes/__root.tsx`, ajouter :
- `<link rel="preconnect" href="/__l5e" crossorigin>` (idempotent)
- Preload du fond hero uniquement sur la route `/` (déjà eager mais un `rel="preload"` améliore le LCP).

### 4. Vérifier le poids réel du hero background
Vérifier la taille de `nexora-brand.jpg` (fond hero). S'il dépasse 300 Ko, le régénérer plus léger.

### 5. Petits ajustements
- Ajouter `loading="lazy"` + `decoding="async"` aux images du blog (PostCard, LatestPosts, cartes galerie déjà OK).
- Ajouter `width`/`height` explicites partout où ça manque pour éviter le CLS.

### 6. Vérification
- `bun run build` doit passer.
- Ouvrir le preview et mesurer avec DevTools (poids total < 2 Mo attendu vs ~7 Mo actuel).

## Détails techniques

- Les nouveaux PNG features seront générés via `imagegen--generate_image` en **fast quality, 512×512, transparent_background=true**, puis uploadés via `lovable-assets create` — le pointeur `.asset.json` sera écrasé, aucun changement de code nécessaire dans `index.tsx`.
- Aucun changement de logique métier, uniquement présentation et assets.
- Aucun impact sur le SEO, les paiements, les workflows ou les APIs.

Prêt à passer en build pour appliquer ?