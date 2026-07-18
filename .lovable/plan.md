# Plan : Optimisation du chargement des images de compatibilité

## Objectif
Améliorer les Core Web Vitals (LCP, CLS) et réduire la bande passante sur la section **Devices** de la page d'accueil en appliquant un lazy loading strict, des tailles responsives (`srcset`/`sizes`) et un déclenchement uniquement lorsque la zone entre dans le viewport.

## État actuel confirmé
Dans `src/routes/index.tsx` :
- L'image principale `devicesMain.url` est en `loading="lazy"` sans `srcset` ni `sizes`.
- Les 7 thumbnails ont `loading="lazy"`, `width={160} height={160}`, mais pas de `srcset`/`sizes`.
- Les assets sont externalisés via `src/assets/devices/*.jpg.asset.json` (URL relative `/__l5e/assets-v1/...`).

## Travail à réaliser

### 1. Composant utilitaire `<ResponsiveImage />`
- Créer un petit composant réutilisable dans `src/components/ResponsiveImage.tsx`.
- Générer un `srcset` à partir des URLs Lovable avec des largeurs cibles : `400w`, `800w`, `1200w` (format d'URL `?w=...` si le CDN Lovable le supporte, sinon utiliser l'image originale et laisser le navigateur scaler).
- Accepter les props `sizes`, `alt`, `width`, `height`, `className`, `loading`, `fetchpriority`, `decoding="async"`.
- Ajouter un `IntersectionObserver` optionnel pour charger l'image uniquement quand elle entre dans le viewport (fallback natif `loading="lazy"` si indisponible).

### 2. Section Devices (`src/routes/index.tsx`)
- Remplacer l'image principale par `<ResponsiveImage />` avec :
  - `sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"`
  - `srcset` : 400w / 800w / 1200w / 1600w
  - `loading="lazy"`, `decoding="async"`, `fetchpriority="low"` (car elle est sous le fold)
- Remplacer les 7 thumbnails par `<ResponsiveImage />` avec :
  - `sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 15vw"` (la grille passe de 2 à 4 à 7 colonnes)
  - `srcset` : 160w / 320w / 480w
  - `loading="lazy"`, `decoding="async"`, `fetchpriority="low"`
- Conserver `aspect-square` et `object-cover` pour éviter le débordement.
- Ajouter des dimensions explicites (`width`/`height`) sur chaque image pour éviter le CLS.

### 3. Vérification
- Vérifier que les attributs `srcset` et `sizes` sont bien présents dans le DOM final.
- Vérifier que le lazy loading déclenche le chargement uniquement au scroll dans la zone visible.
- Vérifier que le build TypeScript passe et qu'il n'y a pas de régression visuelle.

## Fichiers concernés
- `src/components/ResponsiveImage.tsx` (nouveau)
- `src/routes/index.tsx` (modification de la section `Devices`)

## Non concerné
- Pas de regénération d'images : les assets existants sont réutilisés.
- Pas de modification du design (bordures, couleurs, mise en page) ; uniquement l'optimisation du chargement.

## Questions
1. Le CDN Lovable accepte-t-il le paramètre `?w=...` pour le redimensionnement ? Si non, le plan utilisera l'image originale dans `srcset` avec différents descripteurs de largeur (le navigateur choisira la meilleure, mais il téléchargera la même image haute résolution).
2. Souhaites-tu préserver le `loading="eager"` de l'image principale dans `Hero` (elle est déjà eager et préloadée) ou appliquer la même optimisation à toutes les images de la page ? Ce plan se concentre uniquement sur la section Devices comme demandé.