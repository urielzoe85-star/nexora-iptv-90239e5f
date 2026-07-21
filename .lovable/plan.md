## Diagnostic

L'erreur retournée par le gateway est claire :

```
AI Gateway 400: Unsupported parameter: 'max_tokens' is not supported with this model.
Use 'max_completion_tokens' instead.
```

Le helper central `src/lib/ai-center/ai-provider.server.ts` envoie `max_tokens` dans **toutes** les requêtes chat (Content Creator, SEO Intelligence, Dashboard IA…). Les modèles OpenAI récents (GPT-5.x) et certains modèles utilisés en fallback rejettent ce champ — d'où le fait qu'*aucun* module AI Center ne répond.

La génération d'image passe par le même helper pour ses prompts textuels et échoue donc aussi.

## Correction

Un seul fichier à corriger : `src/lib/ai-center/ai-provider.server.ts`.

1. Remplacer `body.max_tokens = opts.maxTokens` par `body.max_completion_tokens = opts.maxTokens`. C'est le champ accepté par la totalité du catalogue Lovable AI (OpenAI + Gemini via OpenRouter).
2. Ne rien changer d'autre : signature `CallOptions.maxTokens`, appelants (`content.functions.ts`, `seo.functions.ts`, `image.functions.ts`…), et modèle par défaut `google/gemini-3.6-flash` restent identiques.

## Vérification

Après le fix, relancer 3 tests côté `/ncc/ai` :
- Content Creator → génération d'un brouillon court.
- SEO Intelligence → audit d'une page.
- Image IA → bouton 🎨 dans l'éditeur blog.

Si un test échoue encore, lire le nouveau message d'erreur du gateway (les codes 429 / 402 / 401 ont des remédiations différentes — clé, crédits, rate-limit) plutôt que de re-modifier le body.

## Hors périmètre

- Aucune modification des tokens/connecteurs externes (WhatsApp, Telegram, Resend, SebPay…) : ils fonctionnent, seul le champ envoyé au gateway IA est en cause.
- Aucune rotation de `LOVABLE_API_KEY` : l'erreur est un 400 de validation, pas un 401.
