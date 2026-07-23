## Nexora AI Chat — Assistant IA client + Copilote NCC

Un vrai assistant IA (streaming, mémoire, outils) intégré au site public **et** au NCC, avec une file d'approbation obligatoire pour toute action déclenchée côté client.

---

### 1. Architecture globale

```text
        ┌──────────────────────────┐          ┌──────────────────────────┐
        │  Client (site public /   │          │   NCC (admin)            │
        │  espace-client)          │          │   Copilote Nexora        │
        │  → session éphémère      │          │   → threads persistants  │
        └─────────────┬────────────┘          └─────────────┬────────────┘
                      │                                      │
                      ▼                                      ▼
              POST /api/ai/chat/client            POST /api/ai/chat/ncc
              (streamText + tools "read only"     (streamText + tools admin
               + tool "request_action" qui         complets, exécution
               n'exécute JAMAIS, crée juste        directe possible mais
               une ai_action_request)              tools mutation exigent
                      │                            confirmation UI)
                      ▼                                      │
              ai_action_requests (pending) ─────────────────┤
                      │                                      │
                      ▼                                      ▼
        NCC → /ncc/ai/approvals  ←── notification Telegram admin
        (Approuver / Rejeter / Modifier → exécute réellement)
```

Provider IA : Lovable AI Gateway (déjà en place via `src/lib/ai-center/ai-provider.server.ts`). On passe au **AI SDK** (`streamText` + `tool()`) pour avoir le streaming, les tool calls et la mémoire propre.

---

### 2. Base de données (nouvelle migration)

**`ai_chat_threads`** — un thread = une conversation admin. Client = pas de row (éphémère).
- `id uuid pk`, `user_id uuid` (admin), `title text`, `pinned bool`, `archived bool`, `created_at`, `updated_at`.

**`ai_chat_messages`** — messages persistés (NCC uniquement).
- `id uuid pk`, `thread_id fk`, `role` (`user`|`assistant`|`tool`), `parts jsonb` (UIMessage AI SDK), `created_at`.

**`ai_action_requests`** — file d'approbation (les deux côtés y déposent).
- `id`, `source` (`client`|`ncc`), `requester_user_id` (nullable si visiteur), `requester_contact jsonb` (email/phone/orderId), `action_type` (`renew_subscription`, `refund`, `change_device`, `create_order`, `send_bulk`, `publish_post`, …), `payload jsonb`, `ai_reasoning text`, `status` (`pending`|`approved`|`rejected`|`executed`|`failed`), `reviewed_by`, `reviewed_at`, `execution_result jsonb`, `created_at`.
- RLS : admin only ; insert autorisé via server function (pas d'accès direct client).

Grants + RLS conformes au standard (voir règle `public-schema-grants`).

---

### 3. Côté client (site public + espace-client)

**Widget flottant** `NexoraAssistantWidget` — pastille en bas à droite (à côté de WhatsApp/Messenger, empilage cohérent avec `FloatingWhatsApp.tsx`).
- Icône dédiée (pas Sparkles) : petit logo Nexora IA généré.
- Ouvre un panneau de chat compact (mobile full-screen, desktop 400×600).
- Session éphémère : `sessionStorage` (perdue à la fermeture du navigateur, conforme au choix "session éphémère").
- Composants **AI Elements** : `Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`, `Tool` (installation via `bun x ai-elements@latest add …`).

**Route serveur** `src/routes/api/ai/chat.client.ts` (streaming, `toUIMessageStreamResponse`) :
- Contexte système = Knowledge Base (`ai_knowledge_base` déjà en place) + catalogue plans + FAQ.
- Rate limit léger (IP-based, `src/lib/rate-limit.server.ts` déjà en place).
- **Tools "safe" (lecture seule, exécutés directement)** :
  - `search_knowledge_base(query)` — RAG simple sur `ai_knowledge_base`.
  - `list_plans()` — retourne les offres/prix.
  - `get_order_status({ email, orderRef })` — lookup limité par email + ref (pas de listing).
  - `troubleshoot_playback({ symptom, device })` — arbre de décision guidé.
  - `checkout_link({ planId })` — retourne un lien `/checkout?plan=…`.
- **Tool "sensible" `request_admin_action(action_type, payload, reason)`** : ne fait qu'insérer une row `ai_action_requests` (status `pending`) → réponse : « J'ai transmis ta demande à un conseiller Nexora, tu recevras une confirmation ».
- Aucun tool ne mute directement une commande, abonnement, paiement.

---

### 4. Côté NCC — Copilote Nexora

**Nouvelle section NCC** : `/ncc/ai/copilot` (chat plein-écran) + `/ncc/ai/approvals` (file).

Threads persistants (`ai_chat_threads` / `ai_chat_messages`), sidebar de threads (nouvelle conversation, épinglés, archivés, recherche).

**Route serveur** `src/routes/api/ai/chat.ncc.ts` (auth admin via `requireAdmin`, streaming) :
- Contexte système = KB + rôle admin + capacité outils.
- Persistance : à chaque `onFinish`, insert du message assistant dans `ai_chat_messages`.
- **Tools copilote (lecture directe)** :
  - `query_orders`, `query_customers`, `query_iptv_accounts`, `query_logs`, `revenue_report`, `dunning_report`.
  - `search_web` (via connecteur web search si dispo, sinon fetch simple).
  - `seo_audit_summary` (branché sur `ai_seo_suggestions` déjà là).
  - `competitor_scan` (Semrush si connecté, sinon fallback fetch).
- **Tools mutation (exigent confirmation UI côté NCC)** :
  - `create_iptv_account`, `renew_subscription`, `refund_order`, `send_bulk_message`, `publish_blog_post`, `send_telegram_broadcast`.
  - Rendus via `<Tool>` d'AI Elements avec `needsApproval` → bouton **Exécuter** dans le message → l'exécution appelle la server function existante (`iptv.functions.ts`, `bulk-send.functions.ts`, `blog.functions.ts`, etc.). Aucun code métier dupliqué.
- **Automatisations proactives** : job `pg_cron` (existant) qui, tous les jours, appelle une server function `generate_proactive_insights()` → génère des recommandations (SEO, anomalies paiement, dunning) et les poste comme messages système dans un thread "Alertes Nexora".

**File d'approbation** `/ncc/ai/approvals` :
- Liste `ai_action_requests where status='pending'` (badge dans la sidebar NCC + notif Telegram via `telegram.server.ts` sur insert).
- Chaque row : contexte demandeur + payload + raisonnement IA + boutons **Approuver / Rejeter / Modifier & approuver**.
- Approuver → server function `execute_action_request(id)` qui dispatch vers la vraie server function (`iptv-delivery.builder.ts`, `payments.functions.ts`, `blog.functions.ts`, …) puis update `execution_result` + `status='executed'`.
- Depuis le chat NCC, un admin peut aussi ouvrir un thread client (si linké à un `order`/`customer`) pour voir le contexte, puis approuver depuis le chat directement — bouton inline dans le message.

---

### 5. Approbation : les deux surfaces (choix confirmé)

1. **Page dédiée** `/ncc/ai/approvals` — tri rapide, filtres, actions en lot.
2. **Intégré au chat NCC** — quand l'admin ouvre un thread client (via lien depuis la file), il voit la conversation + bouton Approuver dans le contexte.
3. **Notification Telegram admin** à chaque nouvelle demande (via `telegram.server.ts` déjà branché sur chat_id `5533621492`).

---

### 6. Sécurité & garde-fous

- **RLS strict** sur les 3 nouvelles tables + GRANT explicites (règle `public-schema-grants`).
- Aucun tool client ne peut lire des données d'un autre utilisateur (lookup order = email + ref exigés).
- Tous les tools mutation passent par les server functions existantes (RLS + `requireAdmin` en place).
- Rate limit IA client : 20 msg / IP / heure (anti-abus, on économise les crédits Gateway).
- `ai_actions_log` (déjà là) reçoit chaque appel IA (tokens, coût, latence) pour observabilité.
- `LOVABLE_API_KEY` reste server-only.

---

### 7. Fichiers concernés (aperçu)

**Nouveaux**
- Migration : `ai_chat_threads`, `ai_chat_messages`, `ai_action_requests` + RLS + grants.
- `src/routes/api/ai/chat.client.ts` (streaming, tools client).
- `src/routes/api/ai/chat.ncc.ts` (streaming, tools admin).
- `src/lib/ai-chat/tools-client.server.ts`, `src/lib/ai-chat/tools-ncc.server.ts`.
- `src/lib/ai-chat/action-executor.server.ts` (dispatcher approuvé → server fns métier).
- `src/lib/ai-chat/threads.functions.ts` (list/create/rename/archive threads admin).
- `src/lib/ai-chat/approvals.functions.ts` (list/approve/reject/execute).
- `src/components/ai-chat/NexoraAssistantWidget.tsx` (client public flottant).
- `src/components/ncc/ai/CopilotPage.tsx` + `ThreadSidebar.tsx` + `ApprovalsPage.tsx`.
- Routes TanStack : `src/routes/ncc.ai.copilot.tsx`, `src/routes/ncc.ai.approvals.tsx`.
- Composants AI Elements installés dans `src/components/ai-elements/`.

**Modifiés**
- `src/routes/__root.tsx` : mount `NexoraAssistantWidget` (à côté du bloc WhatsApp/Messenger).
- `src/lib/ncc/modules.ts` : ajout entrées **Copilote IA** + **Approbations** dans la sidebar NCC (avec badge de count pending).
- `src/components/ncc/NccSidebar.tsx` (badge live count).
- `src/lib/telegram.server.ts` : helper `notifyAdminNewApproval()`.

**Inchangé**
- Tous les workflows métier existants (paiements, IPTV, blog, bulk, WhatsApp).
- `ai_center` existant (KB, SEO, content) — le copilote **consomme** la KB, ne la remplace pas.
- Widgets flottants WhatsApp/Messenger (l'assistant s'ajoute au stack, ne les remplace pas).

---

### 8. Livraison en 3 vagues

**Vague A — Fondations & Copilote NCC read-only** *(base + valeur immédiate pour toi)*
Migration DB, provider AI SDK, streaming, threads persistants, tools lecture (orders/customers/logs/revenue), AI Elements installés, route `/ncc/ai/copilot`.

**Vague B — Widget client + file d'approbation**
Widget flottant public, tools client safe, `request_admin_action`, page `/ncc/ai/approvals`, notif Telegram, exécution approuvée.

**Vague C — Tools admin mutation + proactif**
Tools mutation avec confirmation inline dans le chat NCC, `search_web`, veille concurrentielle, job cron `generate_proactive_insights`, thread "Alertes Nexora".

Je peux commencer par la Vague A dès approbation.
