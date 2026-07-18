Actuellement, les 7 thumbnails de la section « Devices » sont affichés en 56 × 56 px avec un petit `ring` doré et des coins arrondis, ce qui crée une bordure visible et réduit l’image.

Plan de modification dans `src/routes/index.tsx` :

1. Supprimer le `ring-1 ring-[color:var(--gold)]/20` et le `rounded-lg` sur les `<img>` des thumbnails pour qu’ils touchent les bords du cadre.
2. Augmenter la taille de l’image à l’intérieur de chaque carte (passer à `h-20 w-20` avec les attributs `width={80} height={80}`) afin qu’elle occupe plus d’espace.
3. Conserver `object-cover` pour que la photo remplisse toujours le cadre sans déformation.
4. Vérifier visuellement en preview que les images remplissent bien les cadres sans bordure résiduelle.

Aucun fichier image à regénérer ni à ré-uploader : les assets sont déjà en 816 × 816 px, c’est uniquement l’affichage qui change.