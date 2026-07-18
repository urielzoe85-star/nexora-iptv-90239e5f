## Rendre le blog visible depuis le site public

Ajouter des points d'entrée vers `/blog` à trois endroits pour que les visiteurs découvrent les articles sans taper l'URL.

### 1. Lien "Blog" dans le menu principal
Ajouter un lien `<Link to="/blog">Blog</Link>` dans la barre de navigation publique (header) affichée sur toutes les pages du site, avec l'état actif (`activeProps`) pour surligner l'onglet quand on est sur `/blog` ou `/blog/...`.

### 2. Section "Derniers articles" sur la page d'accueil
Ajouter, en bas de la home (`src/routes/index.tsx`), une section qui affiche les **3 derniers articles publiés** :
- Titre de section : « Derniers articles du blog »
- Grille de 3 cartes `PostCard` (composant déjà existant)
- Bouton « Voir tous les articles » → `/blog`
- Données : appel à `publicListPosts({ page: 1, page_size: 3 })` (server function déjà en place)
- Auto-refresh identique à la page `/blog` (poll 30 s + refetch on focus) pour que la home reflète immédiatement les nouvelles publications

Si aucun article n'est publié, la section ne s'affiche pas (aucun état vide sur la home).

### 3. Lien "Blog" dans le footer
Ajouter une entrée « Blog » dans le footer public, dans la même colonne que les autres liens de contenu (À propos, Guide, etc.).

### Ce qui ne change pas
- Aucun changement backend, aucune migration, aucun changement d'RLS.
- Le composant `PostCard`, les server functions `publicListPosts` et les routes `/blog*` existent déjà.
- Aucune modification du CMS NCC ni du workflow de publication.

### Après déploiement
Cliquer sur **Publier** pour que le nouveau menu, la section home et le footer soient visibles sur `nexora-iptv.com`.
