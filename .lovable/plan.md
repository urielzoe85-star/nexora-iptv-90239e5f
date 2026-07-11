## État actuel

Tu m'as fourni :
- **Phone Number ID** : `1006407992170433`
- **Nouveau token permanent** WhatsApp

Les secrets ne sont pas encore écrasés côté serveur (j'attendais ton feu vert avant de toucher aux valeurs existantes).

## La suite — 3 étapes

1. **Remplacer les 2 secrets WhatsApp**
   - Supprimer `WHATSAPP_PHONE_NUMBER_ID` et `WHATSAPP_ACCESS_TOKEN` (obligatoire, `set_secret` n'écrase pas).
   - Recréer avec les valeurs que tu viens d'envoyer.

2. **Rejouer le test d'envoi** vers ton numéro `+237 698 608 808`
   - Appel : `POST /api/public/whatsapp/test-send?token=<verify>&to=237698608808`
   - Succès attendu : Meta renvoie `messages[0].id` et tu reçois le message WhatsApp "✅ Test Nexora…" sur ton téléphone.

3. **Interpréter le résultat**
   - ✅ Si OK → l'intégration Cloud API est validée. On peut brancher les notifications réelles (livraison IPTV, alertes admin) sur le canal WhatsApp du hub.
   - ❌ Si Meta renvoie encore une erreur → je te donne le code exact + la case précise à corriger dans Meta Business (System User / rôle WABA / scopes du token), sans re-deviner.

## Ce qui ne change pas

Aucun fichier code n'est touché. Le handler `test-send`, `whatsapp.server.ts` et le webhook `/api/public/whatsapp/webhook` sont déjà corrects — c'est purement une mise à jour de secrets + test.

Valide ce plan et je passe en build pour exécuter les 3 étapes d'un coup.