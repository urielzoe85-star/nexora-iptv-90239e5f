## Objectif
Permettre à NEXORA AI Content Creator de générer automatiquement des **images premium** (cover + illustrations in-article) et de les intégrer aux articles de blog générés par IA, tout en gardant la génération manuelle possible.

## Ce qui sera ajouté

### 1. Génération d'images via Lovable AI Gateway
Nouveau fichier `src/lib/ai-center/image-gen.server.ts` qui appelle `https://ai.gateway.lovable.dev/v1/images/generations` avec `google/gemini-3-pro-image` (qualité premium, éditorial photo-réaliste) en non-streaming (job serveur). 
- Prompt enrichi automatiquement avec ton/style Nexora (photo-réaliste, éclairage cinématique, palette navy/gold, ambiance premium tech, pas de texte incrusté).
- Upload du PNG b64 vers le bucket `blog_media` (chemin `ai/{year}/{slug}-{hash}.png`).
- Retourne une **URL signée longue durée** (10 ans, cohérente avec la politique de sécurité existante des buckets media).
- Fallback automatique sur `google/gemini-3.1-flash-image` si le modèle pro échoue.

### 2. Intégration dans `generateBlogDraft`
Extension de `src/lib/ai-center/content.functions.ts` :
- Nouveaux paramètres d'entrée : `generateImages: boolean` (défaut `true`), `illustrationsCount: 0..4` (défaut `2`), `imageStyle: "photorealistic" | "editorial" | "3d_isometric" | "minimal"` (défaut `photorealistic`).
- Étape 1 : le modèle texte renvoie aussi, dans son JSON, un tableau `imagePrompts: [{ slot: "cover"|"inline", prompt, alt, placement?: "after-h2:<index>" }]`.
- Étape 2 : le serveur génère chaque image en parallèle (Promise.all avec limite), remplace/insère :
  - `cover_image_url` + `cover_image_alt` sur `blog_posts`.
  - Illustrations injectées dans `content_html` via des balises `<figure><img src loading="lazy" width height/><figcaption/></figure>` placées après les `<h2>` correspondants (ou en fin si placement absent).
- Échec d'une image = on skip cette image, on log, l'article se sauvegarde quand même.

### 3. Nouveau server function `generateImage`
`generateImageForPost({ postId, prompt, slot: "cover"|"inline", alt })` : bouton "Générer une image IA" dans l'éditeur de blog NCC pour enrichir un article existant (cover ou insertion au curseur).

### 4. UI Content Creator (`/ncc/ai/content`)
Ajout dans le formulaire :
- Toggle "Générer des images premium" (on par défaut).
- Sélecteur nombre d'illustrations (0–4).
- Sélecteur style visuel.
- Prévisualisation cover + illustrations après génération avec le brouillon.

### 5. UI Blog Editor (`src/components/ncc/blog/BlogEditor.tsx`)
Bouton "🎨 Générer image IA" à côté du champ cover et dans la toolbar TipTap pour insérer une illustration au curseur.

### 6. Journal & coût
Chaque génération loggée dans `ai_actions_log` (kind = `image_gen`) avec prompt, modèle, taille, statut. Aucun changement de schéma requis (le tableau existant supporte déjà les kinds libres).

## Détails techniques
- Modèle image par défaut : `google/gemini-3-pro-image` (qualité premium). Body Gemini chat : `messages` + `modalities: ["image","text"]`, `stream: false` côté serveur (on récupère `data[0].b64_json`).
- Taille cible cover : 1536x864 (16:9), illustrations : 1280x720. Compression côté serveur non nécessaire (PNG direct).
- Upload via `supabaseAdmin.storage.from("blog_media").upload(...)` puis `createSignedUrl(path, 10 ans)`.
- `content_html` post-processing : parse minimal (regex robuste sur `<h2>...</h2>`) pour insérer les `<figure>` sans casser le HTML existant.
- Pas de streaming côté client (les images sont générées côté serveur avant réponse — le brouillon revient prêt).

## Ce qui reste inchangé
- Structure `blog_posts`, RLS, redirects, sitemap, RSS.
- Bucket `blog_media` (déjà en signed URLs 10 ans).
- Génération texte, FAQ, JSON-LD, slug, brouillon draft.
- Éditeur TipTap, publication, partages.

## Livrables
1. `src/lib/ai-center/image-gen.server.ts` (nouveau)
2. `src/lib/ai-center/content.functions.ts` (étendu)
3. `src/lib/ai-center/image.functions.ts` (nouveau — `generateImageForPost`)
4. `src/routes/_authenticated/ncc/ai/content.tsx` (UI étendue)
5. `src/components/ncc/blog/BlogEditor.tsx` (bouton "Générer image IA")
