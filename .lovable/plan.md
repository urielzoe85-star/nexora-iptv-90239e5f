
## Problème

Aujourd'hui, quand un visiteur (anonyme, pas encore client) demande à parler à un humain, l'IA crée une `ai_action_request` et envoie une notification Telegram à l'admin. Mais l'admin n'a aucun moyen de **répondre au visiteur dans la conversation en cours** : le visiteur n'est ni sur Telegram, ni identifié (pas d'email, pas de téléphone), il n'existe qu'à travers son `sessionId` navigateur et son `thread_id` en base.

## Objectif

Permettre à un admin NCC de reprendre la main sur n'importe quelle conversation visiteur et d'échanger en direct, sans quitter le widget de chat côté visiteur.

## Approche

Introduire un **mode "handoff humain"** sur les threads visiteurs, avec messagerie temps réel via Supabase Realtime sur la table `ai_chat_messages` existante.

### 1. Base de données (1 migration)

- `ai_chat_threads` : ajouter
  - `handoff_status` text (`ai` | `requested` | `human` | `closed`), défaut `ai`
  - `assigned_admin_id` uuid null
  - `handoff_requested_at`, `handoff_started_at`, `handoff_closed_at` timestamptz
- `ai_chat_messages` : ajouter `sender` text (`visitor` | `assistant` | `admin`) pour distinguer un message humain d'un message IA (le `role` reste `user`/`assistant` pour l'AI SDK).
- Policies : autoriser `anon` à INSERT/SELECT sur son propre thread via `session_id` (déjà présent) ; autoriser `authenticated` admins à tout lire/écrire.
- Activer Realtime (`alter publication supabase_realtime add table ai_chat_messages, ai_chat_threads`).

### 2. Outil IA `request_human_handoff`

Remplacer/compléter le pattern actuel `create_action_request({tool:"talk_to_agent"})` par un outil dédié qui, en plus de créer la demande, bascule `handoff_status='requested'` sur le thread et notifie Telegram avec un lien direct `/ncc/ai/inbox/<threadId>`.

### 3. Route API visiteur

- `chat.visitor.ts` : avant d'appeler `streamText`, lire `handoff_status` du thread. Si `human` → **ne pas appeler le modèle**, juste persister le message visiteur (`sender='visitor'`) et renvoyer un stream vide + un system-message léger ("Un conseiller vous répond en direct").
- Nouveau endpoint `POST /api/public/ai/chat/visitor/poll` (ou souscription Realtime côté client) pour recevoir les messages admin.

### 4. Nouveau module NCC "Boîte de réception IA" — `/ncc/ai/inbox`

- Liste des threads visiteurs triés par `handoff_status` (requested en tête) + dernier message.
- Vue thread `/ncc/ai/inbox/$threadId` :
  - Historique complet (visiteur / IA / admin distingués visuellement).
  - Boutons "Prendre en charge" (`handoff_status → human`, assigne l'admin) / "Rendre à l'IA" / "Clôturer".
  - Composer admin qui insère un message `role='assistant', sender='admin'` — il apparaît instantanément côté visiteur via Realtime.
- Server functions `assignHandoff`, `sendAdminMessage`, `closeHandoff` protégées par `requireSupabaseAuth` + `has_role('admin')`.

### 5. Widget visiteur

- S'abonner à Realtime sur `ai_chat_messages` filtré par `thread_id` dès qu'un `threadId` existe.
- Injecter les messages `sender='admin'` dans le state `useChat` (via `setMessages`) pour qu'ils s'affichent inline.
- Bandeau d'état en haut du widget : "🟢 Un conseiller Nexora est avec vous" quand `handoff_status='human'`.
- Désactiver l'indicateur "IA écrit…" en mode humain.

### 6. Notifications admin

- Telegram : notification enrichie sur `handoff_status='requested'` avec le lien inbox + les 3 derniers messages du visiteur pour contexte.
- Badge compteur "🔴 N" sur l'entrée de menu NCC "Boîte IA".

## Détails techniques

- **Realtime côté widget** : `supabase.channel('thread:'+threadId).on('postgres_changes', { event:'INSERT', table:'ai_chat_messages', filter:'thread_id=eq.'+threadId }, …)`. Filtrer `sender='admin'` pour éviter d'ajouter en double les messages déjà rendus par le stream.
- **Identité visiteur** : rester sur `sessionId` navigateur. Optionnel : petit champ "prénom + email (facultatif)" affiché quand `handoff_status='requested'`, stocké dans `ai_chat_threads.visitor_meta jsonb` pour aider l'admin à recontacter hors-ligne.
- **Persistance** : messages admin insérés directement (pas via AI SDK), avec `parts=[{type:'text',text:…}]` pour rester compatible avec le rendu existant.
- **Zéro impact** sur l'expérience IA actuelle : tant que `handoff_status='ai'`, tout fonctionne comme aujourd'hui.

## Livrables

1. Migration SQL (colonnes + policies + realtime).
2. Outil AI `request_human_handoff` + mise à jour `system-prompts.server.ts` (l'IA sait quand escalader).
3. `chat.visitor.ts` : court-circuit du modèle en mode humain.
4. Routes NCC : `ncc.ai.inbox.tsx` (liste) + `ncc.ai.inbox.$threadId.tsx` (conversation) + server functions.
5. `NexoraAssistantWidget.tsx` : abonnement Realtime + bandeau handoff + affichage messages admin.
6. Ajout entrée "Boîte IA" dans la sidebar NCC avec badge de threads en attente.

## Hors périmètre (peut venir après)

- App mobile admin dédiée.
- Réponses canned / macros.
- Transfert entre admins.
- Chiffrement E2E.
