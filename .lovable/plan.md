
## Problème observé

Les logs AI Gateway montrent une série d'erreurs `http 400` (upstream Gemini) sur `/api/public/ai/chat/visitor` — c'est ce qui fait que l'IA "ne sait plus quoi répondre" côté visiteur.

Cause principale identifiée dans `src/routes/api/public/ai/chat.visitor.ts` :

Quand le thread passe en `handoff_status = "requested"` ou `"human"`, l'endpoint tente de renvoyer un flux "vide" en appelant quand même Gemini avec :
```ts
streamText({
  model,
  system: "Return an empty response.",
  messages: [{ role: "user", content: "" }],
  maxOutputTokens: 1,
})
```
Gemini rejette ce payload (contenu utilisateur vide) → 400 → le widget affiche une bulle vide / plante et le visiteur ne reçoit plus rien après avoir demandé un humain.

Effet secondaire : une fois le handoff demandé, chaque nouveau message visiteur retape ce chemin cassé.

Un second point fragile : dans la branche normale, `onFinish` persiste `prev` (user) + `last` (assistant), mais si le modèle a émis un tool-call sans texte final, `last` peut ne pas être `assistant` avec du texte, et rien n'est persisté → au prochain bootstrap le widget resynchronise sans le dernier tour et peut renvoyer des messages user consécutifs au modèle.

## Correctifs (uniquement le chat visiteur, rien d'autre)

1. **`src/routes/api/public/ai/chat.visitor.ts` — supprimer l'appel Gemini "vide" pendant le handoff**
   - Quand `handoff_status ∈ {requested, human}` :
     - Persister le dernier message visiteur (comme aujourd'hui).
     - Retourner **directement** une réponse UI-message stream vide et bien formée, sans passer par `streamText`. On construit un `ReadableStream` qui écrit uniquement les événements d'ouverture/fermeture attendus par `@ai-sdk/react` (`data: [DONE]` / message-finish) avec les headers `toUIMessageStreamResponse` (content-type `text/event-stream`, `x-vercel-ai-ui-message-stream: v1`, CORS).
     - Alternative plus simple et sûre : renvoyer `new Response("", { status: 204, headers: corsHeaders })` et gérer côté widget l'absence de réponse assistant quand `handoff !== "ai"` (le widget affiche déjà la bannière "un conseiller rejoint la conversation").
   - On garde l'appel modèle **uniquement** dans le cas `handoff === "ai"`.

2. **`src/routes/api/public/ai/chat.visitor.ts` — persistance plus robuste dans `onFinish`**
   - Toujours persister le dernier message user, même si l'assistant n'a produit que des tool-calls sans texte final (chercher le dernier message `role === "user"` non encore présent).
   - Persister l'assistant seulement s'il contient au moins une part `text` non vide.
   - Cela évite les désynchronisations qui font que le widget renvoie deux messages user d'affilée au tour suivant.

3. **`src/components/ai-chat/NexoraAssistantWidget.tsx` — tolérer une réponse vide en handoff**
   - Si `handoff !== "ai"` au moment du `sendMessage`, ne pas attendre un flux assistant : la bannière suffit, et le polling bootstrap ramènera la réponse humaine quand l'admin écrira.
   - Si le POST renvoie 204 (nouveau comportement), ne pas traiter cela comme une erreur.
   - Aucune autre modification UI.

## Vérification

- Rejouer un tour visiteur en mode IA : réponse Gemini normale, un seul 200 dans les logs AI Gateway.
- Demander "je veux parler à un humain" → l'IA appelle `request_human_handoff`, bannière "un conseiller rejoint la conversation" s'affiche, **plus de 400** dans les logs quand le visiteur continue à taper.
- L'admin répond via `/ncc/ai/inbox/$threadId`, le message apparaît chez le visiteur via le polling existant.

Aucun changement au NCC copilot, aux tools, à la DB ou aux policies RLS.
