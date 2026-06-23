## Cause du problème de paiement (résumé)

Le message "**Configuration de paiement indisponible: les clés SebPay LIVE ne sont pas correctement configurées**" vient de notre propre code, pas de SebPay. Il est déclenché par deux choses :

1. **Notre code force une clé publique en dur** (`pk_live_ehfY3G...`) et rejette toute paire qui n'est pas strictement `pk_live_` + `sk_live_`. Si la vraie paire active sur ton compte SebPay est différente (autre clé live, ou paire test), SebPay répond **401 Invalid or inactive API keys** → notre code transforme ça en l'erreur que tu vois.

2. **Le slug `operator` envoyé est invalide.** La doc SebPay (que tu viens de coller) attend `mtn | moov | orange | wav` (minuscules). Notre formulaire envoie `"MTN Mobile Money"` / `"Orange Money"`. Même si l'auth passait, SebPay rejetterait la requête.

## Ce dont j'ai besoin de toi

**Oui, il me faut les deux clés SebPay**, mais une **paire cohérente** (les deux LIVE ou les deux TEST), copiées telles quelles depuis ton dashboard SebPay → API Keys :

- `SEBPAY_PUBLIC_KEY` → `pk_live_...` (ou `pk_test_...`)
- `SEBPAY_SECRET_KEY` → `sk_live_...` (ou `sk_test_...`) **de la même paire**

Je les demanderai via un formulaire sécurisé (jamais à coller dans le chat).

## Correctifs code (appliqués une fois en build mode)

### `src/lib/payments.functions.ts`
- Supprimer la clé publique codée en dur ; utiliser uniquement `process.env.SEBPAY_PUBLIC_KEY`.
- Supprimer le rejet "doit être LIVE". Rejeter uniquement si les deux clés ne sont **pas dans le même mode** (live+live ou test+test).
- Ajouter `operatorSlug()` : `"MTN Mobile Money" → "mtn"`, `"Orange Money" → "orange"` (+ `moov`, `wav` prêts).
- Normaliser `phone` : retirer `+`, espaces, tirets (format international sans `+`, conforme à la doc).
- Garder les diagnostics sûrs (longueur/prefix/mode, jamais la valeur complète) et le message générique côté client.

### `src/routes/checkout.tsx`, `src/lib/orders.functions.ts`, webhook
- Aucun changement nécessaire (UI inchangée, conversion XOF déjà OK, HMAC déjà en place).

### Secrets
- Ouverture du formulaire `update_secret` pour `SEBPAY_PUBLIC_KEY` et `SEBPAY_SECRET_KEY`.

## Test après correctifs
1. Tu saisis la paire de clés dans le formulaire sécurisé.
2. Tu refais un checkout (1 mois) avec ton numéro MoMo.
3. Je vérifie les logs serveur : la réponse SebPay doit contenir `transaction_id` + `provider_link` et tu reçois le prompt USSD.

Confirme pour passer en build : j'applique les correctifs puis j'ouvre le formulaire de saisie des clés.