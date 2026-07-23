## Objectif
Faire répondre l'IA Nexora (widget visiteur + copilote NCC) dans la langue du message reçu (FR/EN, et autres langues courantes).

## Changement
Un seul fichier à modifier : `src/lib/ai-chat/system-prompts.server.ts`.

Renforcer la directive de langue dans `BASE_IDENTITY` et `buildClientSystemPrompt` / `buildNccSystemPrompt` :

- Remplacer « Toujours répondre dans la langue du visiteur (français par défaut) » par une règle explicite et prioritaire :
  - Détecter la langue du **dernier message utilisateur**.
  - Répondre **strictement** dans cette langue (FR, EN, ES, PT, IT, DE, AR…).
  - Si la langue change en cours de conversation, basculer immédiatement.
  - Français uniquement si le message est en français ou ambigu/très court.
  - Les liens internes (/pricing, /faq…) et noms de produits restent inchangés.
  - Les messages de handoff (« Je préviens un conseiller… ») doivent aussi être traduits dans la langue détectée — fournir les variantes FR/EN dans le prompt.

## Hors périmètre
- Pas de changement UI, pas de i18n du widget lui-même (placeholders, bannières).
- Pas de modification des outils, de la base, ni des routes API.
- Pas de détection côté serveur : on laisse le modèle (Gemini 3.6 Flash) gérer la détection, qu'il fait nativement de façon fiable.
