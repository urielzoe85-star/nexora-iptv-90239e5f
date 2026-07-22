
# NEXORA AI Center — MVP v1

Nouveau module admin `NEXORA AI CENTER` intégré au NCC (accès admin, gate `requireAdmin` + `requireNccUnlock` déjà en place). Moteur : Lovable AI Gateway (Gemini/GPT via `createLovableAiGatewayProvider`). Données SEO : connecteur Semrush (à connecter) + Google Search Console (déjà connecté). Sortie contenu : brouillons dans `blog_posts` (status `draft`), relecture humaine avant publication.

## Portée v1 (4 sections)

1. **AI Dashboard** — vue de tête `/ncc/ai`
2. **SEO Intelligence** — `/ncc/ai/seo`
3. **AI Content Creator** — `/ncc/ai/content`
4. **Knowledge Base Nexora** — `/ncc/ai/knowledge`

Hors périmètre v1 (préparés en structure mais grisés « Bientôt ») : Social Media Manager, Competitor Analysis, Marketing Strategist quotidien, Automation Center.

## Architecture

```text
src/routes/ncc.ai.tsx                    # layout (garde admin déjà héritée de /ncc)
src/routes/ncc.ai.index.tsx              # Dashboard
src/routes/ncc.ai.seo.tsx                # SEO Intelligence
src/routes/ncc.ai.content.tsx            # Content Creator
src/routes/ncc.ai.knowledge.tsx          # Knowledge Base

src/lib/ai-center/
  ai-provider.server.ts                  # createLovableAiGatewayProvider() partagé
  knowledge.functions.ts                 # CRUD KB (requireAdmin)
  seo.functions.ts                       # analyse page + suggestions (requireAdmin)
  content.functions.ts                   # génération brouillon (requireAdmin)
  dashboard.functions.ts                 # agrégats + insights (requireAdmin)
  prompts/                               # system prompts par tâche
    seo-audit.ts
    content-writer.ts
    dashboard-insights.ts

src/components/ncc/ai/
  AiHeader.tsx, KpiCards.tsx, InsightsList.tsx,
  SeoAuditor.tsx, ContentComposer.tsx, KnowledgeEditor.tsx
```

Enregistrement dans `src/lib/ncc/modules.ts` : ajout d'un groupe **Intelligence** (nouveau) avec un item `NEXORA AI Center`, statut `ready`, icône `Sparkles`/`Bot`.

## Base de données (nouvelle migration Supabase)

```text
public.ai_knowledge_base
  id uuid pk, section text, title text, content text,
  updated_by uuid, updated_at timestamptz, created_at timestamptz
  -- sections: brand, products, pricing, faq, tone, guides

public.ai_actions_log
  id uuid pk, actor_user_id uuid, kind text, -- 'seo_audit'|'content_draft'|'kb_update'|'dashboard_insight'
  input jsonb, output jsonb, tokens_in int, tokens_out int, model text,
  status text, error text, created_at timestamptz

public.ai_seo_suggestions
  id uuid pk, target_kind text, target_id text, -- 'route' | 'blog_post'
  keyword text, intent text, difficulty text, action text,
  score int, meta jsonb, status text default 'open',
  created_at timestamptz
```

- `GRANT` explicites (`authenticated` + `service_role`) sur les 3 tables.
- RLS : lecture/écriture réservées via `has_role(auth.uid(), 'admin')`.
- Aucune modification des tables existantes ; les brouillons d'articles réutilisent `blog_posts` (`status='draft'`, `author_user_id = auth.uid()`).

## 1. AI Dashboard `/ncc/ai`

Server function `getAiDashboard` (requireAdmin) qui agrège :
- Score SEO global (moyenne des scores `ai_seo_suggestions` récents + heuristique meta title/description sur routes clés).
- Compteurs : articles publiés 30j, drafts IA en attente, mots-clés suivis, suggestions ouvertes.
- 3–5 « insights » générés par appel IA court (Gemini 3.6-flash, structured output `Output.object`) à partir des agrégats + top pages Semrush (via connecteur).

UI : `KpiCards` + `InsightsList` + bouton « Rafraîchir » (throttle 60s côté client). Aucune écriture de contenu ici.

## 2. SEO Intelligence `/ncc/ai/seo`

Deux modes :
- **Audit de page** : l'admin choisit une route publique (liste depuis sitemap) → `runSeoAudit({ url })` récupère le HTML côté serveur (`fetch` de la route publique), passe titre/description/H1/H2/liens + `semrush--page_analysis` via `standard_connectors--call_gateway_connection` (backend, connecteur Semrush) → IA renvoie `{ score, issues[], metaTitle, metaDescription, internalLinks[], keywords[] }`.
- **Recherche mot-clé** : champ + bouton → serveur appelle Semrush `keyword_research` + `serp_analysis` puis résume via IA en `{ intent, difficulty, action, cluster[] }`.

Résultats persistés dans `ai_seo_suggestions`. Actions rapides : « Créer brouillon d'article » (deep link vers Content Creator pré-rempli), « Copier meta » (title/description).

## 3. AI Content Creator `/ncc/ai/content`

Formulaire : sujet, mot-clé principal, mots-clés secondaires (chips), format (tutoriel / guide / comparatif / actu / smart home), longueur (short/medium/long), langue (fr/en), CTA cible (page produit à lier).

Server function `generateBlogDraft` :
1. Charge la Knowledge Base (`ai_knowledge_base`) → assemblée dans le system prompt.
2. Appel Lovable AI Gateway (`openai/gpt-5.4` par défaut, `google/gemini-3.6-flash` pour long-form rapide) avec structured output :
```ts
{ title, slug, excerpt, metaTitle, metaDescription,
  contentHtml, faq: [{q,a}], canonicalPath, keywords[] }
```
3. Insert dans `blog_posts` avec `status='draft'`, `author_user_id=auth.uid()`, `meta_title/description`, `keywords`, `faq_jsonld` généré ; hook existant `bumpSitemapCache` **non** déclenché tant que draft.
4. Redirige vers `/ncc/blog/{id}` pour relecture.

Aperçu en 2 colonnes : brief + rendu Markdown/HTML avant enregistrement. Bouton « Régénérer une section » (H2 par H2). Log dans `ai_actions_log`.

## 4. Knowledge Base `/ncc/ai/knowledge`

CRUD simple (liste + éditeur riche) sur `ai_knowledge_base` avec sections figées : Marque, Produits, Tarifs, FAQ, Ton & style, Guides installation. Injectée automatiquement dans tous les prompts (SEO, Content, Dashboard) via un helper `loadKnowledgeContext()`.

Seed initial (migration) avec le contenu Nexora existant (repris depuis `src/i18n/messages.ts`, `src/domain/iptv/services.ts`, plans, FAQ homepage).

## Sécurité & garde-fous

- Toutes les server functions utilisent `requireAdmin` (déjà couvert par la garde NCC + role check).
- `LOVABLE_API_KEY` : présence vérifiée ; provision via `ai_gateway--create` si manquante.
- Rate-limit léger côté serveur (`src/lib/rate-limit.server.ts` existant) : 20 générations content / heure / admin, 60 audits SEO / heure.
- Semrush : erreurs `ERROR 134 :: TOTAL LIMIT EXCEEDED` affichées proprement, retombée sur analyse IA-seule.
- Tout appel IA/Semrush loggé dans `ai_actions_log` (audit + coût).
- Aucun changement des fonctionnalités existantes (blog public, checkout, notifications, etc.).

## Design

Réutilise le shell NCC (`NccShell`, tokens semantic dark). Cartes statistiques, badges, `Sparkles`/`Bot` icons, animations `motion` légères déjà présentes. En-tête « NEXORA AI CENTER » + sous-titre « NEXORA Intelligence ». Sections « bientôt » (Social, Competitor, Strategist, Automation) rendues comme cartes verrouillées pour préparer la v2.

## Livrables

1. Migration Supabase (3 tables + grants + RLS + seed KB).
2. 4 routes + 4 server-function files + composants UI.
3. Ajout de l'item dans `NCC_MODULES` (groupe « Intelligence »).
4. Provider IA partagé + prompts.
5. Aucune modification des routes publiques ou des workflows existants.

## Hors périmètre (v2 planifiée)

- Social Media Manager (Instagram/FB/TikTok/LinkedIn/X) — nécessite décisions sur connecteurs de publication.
- Competitor Intelligence (rapports comparatifs Semrush multi-domaines).
- Marketing Strategist quotidien (rapport automatique par email).
- Automation Center (publication auto, planification).

Ces sections apparaîtront comme « Bientôt » dans la sidebar pour poser l'architecture.
