## Objectif

Ajouter dans **NCC → NEXORA AI → Content Creator** un bouton **"Générer 3 sujets automatiquement"** qui produit 3 brouillons d'articles complets, prêts à publier après ton accord, avec image OG et URL canonique.

## Fonctionnement

1. Tu cliques sur **"Suggérer 3 sujets"** (aucun champ à remplir).
2. L'IA analyse en parallèle :
   - la **Knowledge Base Nexora** (offres, positionnement, ton),
   - les **mots-clés à fort potentiel** via Semrush (volume, difficulté, tendance) autour de l'IPTV, du streaming, du smart home et des thématiques déjà performantes,
   - les **requêtes réelles** remontées par Google Search Console (impressions, CTR, position — pages à booster),
   - une **recherche web fraîche** (Firecrawl search) pour capter l'actualité / angles récents et éviter les doublons avec le blog existant.
3. Elle propose **3 sujets différenciés** (ex : 1 guide long, 1 comparatif, 1 actualité/tendance), chacun avec :
   - titre, angle, mot-clé principal + secondaires, intention de recherche, difficulté estimée.
4. Pour les sujets que tu valides (checkbox), l'IA génère en tâche de fond, pour chacun :
   - article HTML complet (H2/H3, listes, FAQ + JSON-LD),
   - meta title / meta description,
   - **slug + URL canonique** (`https://nexora-iptv.com/blog/<slug>`),
   - **image OG** générée via Lovable AI Gateway (`google/gemini-3.1-flash-image`, 1200×630, charte Nexora), uploadée sur le bucket `blog-media`, URL stockée dans `og_image_url`,
   - liens internes vers `/produits`, `/pricing`, `/reseller`, articles connexes,
   - statut **`draft`** → visible dans `/ncc/blog`, publiable en 1 clic (rien n'est mis en ligne sans ton accord).
5. Un panneau **"Suggestions IA"** liste les 3 propositions avec aperçu (titre, extrait, image OG, score SEO estimé) et boutons **Publier / Modifier / Rejeter**.

## Livrables techniques

- **Nouveau server function** `suggestBlogTopics` (`src/lib/ai-center/content.functions.ts`) : agrège KB + Semrush (`keyword_research` + `competitive_analysis` sur nexora-iptv.com) + GSC (via connecteur déjà lié) + Firecrawl search, appelle `openai/gpt-5.4` en JSON strict pour retourner 3 sujets structurés.
- **Nouveau server function** `generateBlogDraftsBatch` : boucle sur les sujets approuvés, réutilise `generateBlogDraft` existant, puis appelle un nouvel helper `generateOgImage` (Lovable AI Gateway `/v1/images/generations`, upload Supabase Storage `blog-media/og/<slug>.png`, retour URL publique signée longue durée), écrit `og_image_url` + `canonical_url` sur la ligne `blog_posts`.
- **Nouvelle table légère** `ai_blog_suggestions` (id, topic_json, status: pending/approved/rejected/generated, created_by, created_at) + RLS admin seulement + GRANT authenticated/service_role.
- **UI** : nouvelle section "Suggestions automatiques" en haut de `src/routes/ncc.ai.content.tsx` (bouton principal + liste des 3 cartes avec checkbox groupée et actions), zéro changement sur le formulaire manuel existant.
- **Logs** : chaque étape écrite dans `ai_actions_log` (kind: `content_suggest`, `content_batch_generate`, `og_image_generate`).

## Sécurité & garde-fous

- Endpoint protégé par `requireAdmin` (déjà en place sur `content.functions.ts`).
- Aucune publication automatique : tout reste en `draft`, publication manuelle via `/ncc/blog/$id`.
- Si Semrush/GSC/Firecrawl indisponibles, dégradation propre (l'IA utilise les sources restantes + KB).
- Coût contrôlé : image OG en `gemini-3.1-flash-image` (rapide/économique), texte en `gpt-5.4`.

## Hors périmètre

- Pas de publication programmée automatique (déjà couvert par la planification existante si tu veux la brancher plus tard).
- Pas de modification du workflow de publication ni du RSS / sitemap (déjà auto-régénérés à chaque changement de post).
