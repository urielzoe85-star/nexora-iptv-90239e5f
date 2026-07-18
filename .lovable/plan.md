## Objectif
Sur `/blog`, afficher automatiquement les nouveaux articles publiés sans que le visiteur ait à rafraîchir manuellement.

## Modifications

**`src/routes/blog.index.tsx`** — ajouter le rafraîchissement auto à la `useQuery` de la liste d'articles :
- `refetchInterval: 30_000` (poll toutes les 30 s)
- `refetchOnWindowFocus: true` (recharge dès que l'onglet reprend le focus)
- `refetchOnMount: "always"` + `staleTime: 0` (données considérées obsolètes → refetch à chaque montage)
- Idem sur la query des catégories (intervalle plus long, 5 min) pour refléter les nouvelles catégories.

**`src/routes/blog.categorie.$slug.tsx`** — même traitement sur la liste filtrée par catégorie, pour cohérence.

## Hors scope
- Pas de changement backend, DB, cache CDN, ni de la page article `/blog/$slug`.
- Pas de websocket/realtime Supabase (polling 30 s suffit et reste léger).
- Pas de bouton "Rafraîchir" manuel (le polling + focus couvrent le besoin).

## Vérification
Publier un article depuis NCC → l'onglet `/blog` déjà ouvert le fait apparaître en ≤ 30 s, ou immédiatement en revenant sur l'onglet.
