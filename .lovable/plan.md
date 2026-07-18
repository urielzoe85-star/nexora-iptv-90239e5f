Objectif : remplacer la section « compatibilité / devices » de la landing page par des photos réelles d’appareils pour renforcer la crédibilité.

Analyse actuelle
- Fichier : `src/routes/index.tsx`, fonction `Devices()` (lignes ~244-276).
- Grande image actuelle : `src/assets/devices.jpg` (image générée, faux logo, faux contenus).
- Grille d’appareils : 7 icônes Lucide (Smart TV, Android TV, Fire TV, smartphone, tablette, laptop, desktop) avec des labels traduits.

Plan d’implémentation
1. Générer des photos réelles de 7 appareils
   - Smart TV (écran dans un salon, ambiance réelle).
   - Android TV / Google TV (télécommande + écran).
   - Amazon Fire TV Stick (branché sur un TV, gros plan).
   - Smartphone (iPhone ou Android tenant l’app IPTV).
   - Tablette (iPad ou Android tablette).
   - Laptop (MacBook ou PC portable).
   - Desktop / PC fixe (écran 24-27 pouces sur bureau).
   - Style : photos produits réalistes, éclairage naturel, pas de rendu 3D, pas de logos tiers protégés. Contenus à l’écran resteront génériques ou floutés pour éviter les droits d’image.

2. Externaliser les images via Lovable Assets
   - Upload de chaque photo avec `lovable-assets create`.
   - Création des fichiers `.asset.json` sous `src/assets/devices/...`.
   - Suppression des fichiers binaires sources après upload.

3. Remplacer la grande image hero de la section
   - Créer une image composite / collage des 7 appareils disposés dans un environnement réel (salon + bureau), ou bien une grille masonry de photos.
   - Remplacer l’import `devicesImg` par le nouvel asset.

4. Remplacer les icônes Lucide par des thumbnails photo
   - Modifier la grille `devices` pour pointer vers les assets photo correspondants.
   - Afficher une petite photo carrée/arrondie (40-48 px) au-dessus du label, au lieu de l’icône dorée.
   - Garder les labels (`t(key)`) et l’effet hover existant.

5. Vérifier et livrer
   - `bun run build` ou `tsc --noEmit` pour vérifier les imports.
   - Vérifier visuellement en preview desktop + mobile.
   - Aucune modification de logique métier, ni de backend.

Fichiers impactés
- `src/routes/index.tsx` : composant `Devices()`.
- Nouveaux fichiers : `src/assets/devices/*.jpg.asset.json` (7 images).
- Fichier supprimé : `src/assets/devices.jpg` (remplacé par l’asset composite ou la grille).

Questions pour affiner
- Préfères-tu une seule grande photo composite (style actuel) ou une grille de 7 photos visibles directement ?
- Veux-tu que les photos soient "lifestyle" (dans un salon/bureau) ou "produit" sur fond neutre ?