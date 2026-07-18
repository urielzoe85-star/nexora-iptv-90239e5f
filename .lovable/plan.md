## Objectif
Remplacer les 6 icônes Lucide plates de la section "Pourquoi choisir Nexora IPTV" par des icônes 3D originales rendues (glassmorphism / claymorphism / isométrique) alignées sur la palette navy + or du site.

## Approche
Générer 6 icônes 3D PNG transparentes (1024×1024) via `imagegen`, chacune correspondant à une feature :

1. **Bibliothèque immense** → écran TV 3D avec grille de chaînes
2. **Films & séries** → clap de cinéma 3D
3. **Livraison instantanée** → éclair 3D
4. **Accès mondial** → globe 3D
5. **Paiements sécurisés** → bouclier 3D avec cadenas
6. **Support dédié** → casque support 3D

Style commun (pour cohérence entre les 6) :
- Rendu 3D isométrique glossy, claymorph / soft-3D
- Palette : bleu navy profond (#0B1E3F) + accents or (#D4AF37) — assortie au brand
- Fond blanc solide → converti en PNG transparent via `transparent_background: true`
- Ombres douces intégrées

## Changements techniques
- Générer 6 fichiers dans `src/assets/features/feature-{1..6}.png` avec `model: "premium"` (qualité + détail élevés pour icônes).
- Externaliser vers CDN via `lovable-assets` (fichiers > 100KB probables) — `.asset.json` à côté.
- Modifier `src/routes/index.tsx` section `Features` (lignes 232-259) :
  - Retirer l'array `{ Icon: Tv, ... }` et l'import Lucide `Tv`, `Film`, `Zap`, `Globe2`, `ShieldCheck`, `Headphones` s'ils ne servent nulle part ailleurs.
  - Importer les 6 asset pointers.
  - Remplacer le carré doré `<div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)]">…<Icon /></div>` par un `<img>` 3D (h-20 w-20 environ, `object-contain`, `loading="lazy"`, `decoding="async"`) sans le fond doré (l'icône 3D est autoportante).
  - Conserver l'effet `group-hover:scale-110` et la carte glass.

## Vérification
Vérifier que `Tv/Film/Zap/Globe2/ShieldCheck/Headphones` ne sont pas réutilisés ailleurs dans index.tsx avant de retirer l'import ; sinon garder l'import. Build TypeScript + screenshot Playwright de la section.
