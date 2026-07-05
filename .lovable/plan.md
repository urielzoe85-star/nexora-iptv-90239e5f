## Objectif

Redéfinir le secret `WHATSAPP_VERIFY_TOKEN` avec une nouvelle valeur que vous choisirez, puis vous guider pour la coller côté Meta afin de finaliser le webhook WhatsApp.

## Étapes (guidage pas à pas)

### Étape 1 — Choisir une nouvelle valeur
Je génère pour vous une chaîne aléatoire longue et sûre (32+ caractères, sans caractères spéciaux gênants pour Meta). Vous n'avez rien à inventer.

### Étape 2 — Mettre à jour le secret dans Lovable Cloud
J'utilise l'outil `update_secret` pour `WHATSAPP_VERIFY_TOKEN`. Cela ouvre un formulaire sécurisé où la nouvelle valeur sera enregistrée. Je vous fournirai la valeur en clair **une seule fois** dans le chat pour que vous puissiez la copier vers Meta juste après (elle sera ensuite masquée définitivement côté Cloud).

### Étape 3 — Coller la valeur dans Meta for Developers
Je vous guide pour :
1. Ouvrir Meta for Developers → votre app → **WhatsApp → Configuration → Webhooks**.
2. **Callback URL** : `https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/whatsapp/webhook`
3. **Verify token** : coller la valeur générée à l'étape 2.
4. Cliquer **Verify and save**.

### Étape 4 — Vérifier le handshake
Si Meta valide, la route GET a bien renvoyé le `hub.challenge`. Sinon, je vous aide à diagnostiquer (403 = token mismatch, 503 = secret absent).

### Étape 5 — Souscrire aux événements
Dans le même écran Meta, souscrire au champ `messages` (et `message_template_status_update` si besoin).

## Ce qui NE change pas
- Aucun code modifié.
- La route `src/routes/api/public/whatsapp/webhook.ts` reste telle quelle.
- `WHATSAPP_APP_SECRET` n'est pas touché (nécessaire seulement pour la vérification HMAC des POST, pas pour le handshake GET).
