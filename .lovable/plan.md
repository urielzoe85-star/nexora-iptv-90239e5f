
## Problèmes identifiés

**1. Upload d'image qui ne charge pas (spinner infini)**
Dans `BlogEditor.tsx` et `TipTapEditor.tsx`, l'encodage base64 utilise `btoa(String.fromCharCode(...new Uint8Array(buf)))`. Le spread `...` explose la stack JS dès que le fichier dépasse ~100 Ko, sans message d'erreur visible → le bouton tourne dans le vide.

**2. Vidéo impossible à insérer**
L'éditeur n'accepte que des liens YouTube (extension `@tiptap/extension-youtube`). Aucun bouton pour uploader un fichier vidéo (mp4).

**3. Article publié mais introuvable en ligne**
L'article `Comment configurer IPTV SMARTERS PRO / Lite` est bien en base avec `status='published'`. Deux causes probables :
- Le site public **n'a pas été republié** depuis l'ajout du module blog → les routes `/blog` et `/blog/<slug>` n'existent pas encore sur `nexora-iptv.com`.
- L'article n'a **pas d'image de couverture** (échec upload) et l'UI peut donner l'impression qu'il n'a pas été enregistré.

## Corrections proposées

### A. Upload d'image fiable (fichiers > 100 Ko)
Remplacer l'encodage base64 par un `FileReader.readAsDataURL` (natif, pas de limite de stack) dans les deux composants concernés :
- `src/components/ncc/blog/BlogEditor.tsx` (fonction `uploadCover`)
- `src/components/ncc/blog/TipTapEditor.tsx` (fonction `insertImage`)

Ajouter un toast de progression (`Envoi en cours…`) et un toast d'erreur explicite si l'upload échoue.

### B. Support vidéo dans l'éditeur
Ajouter un bouton "Vidéo" dans la barre d'outils TipTap qui :
- Upload le fichier (mp4/webm, max 50 Mo) via une nouvelle fonction serveur `adminUploadBlogVideo` (même bucket `blog-media`, sous-dossier `videos/`).
- Insère un bloc HTML `<video controls src="…" />` dans l'article.
- Autoriser la balise `video` + attributs `src/controls/poster/width/height` dans `sanitizeBlogHtml` (`src/lib/blog.server.ts`).

Le bouton YouTube existant reste inchangé.

### C. Publier le site
Après les corrections ci-dessus, republier via le bouton **Publier** pour que `/blog` et l'article `comment-configurer-iptv-smarters-pro-lite-…` deviennent visibles sur `https://nexora-iptv.com/blog`.

## Détails techniques

- `FileReader.readAsDataURL` renvoie `data:<mime>;base64,<payload>` → on split sur la virgule et envoie le payload existant à `adminUploadBlogImage` (aucun changement côté serveur).
- Limite image conservée à 8 Mo ; limite vidéo fixée à 50 Mo (validée côté client + `.max(70_000_000)` sur la validation base64 serveur pour tenir compte du surcoût base64).
- `sanitizeBlogHtml` : ajouter `"video","source"` aux tags autorisés et `video: ["src","controls","poster","width","height","preload"]` aux attributs.

## Hors scope
Pas de changement au design ni aux tables. Aucun changement de la logique de publication ni du planificateur `pg_cron`.
