## Objectif

Le webhook `/api/public/whatsapp/webhook` répond `Forbidden` (403) lors de la vérification Meta. Diagnostiquer la cause et valider l'envoi/réception WhatsApp de bout en bout.

## Causes possibles du 403

Le handler GET renvoie 403 dans un seul cas : `mode !== "subscribe"` OU `token !== WHATSAPP_VERIFY_TOKEN`. Donc :

1. `WHATSAPP_VERIFY_TOKEN` n'est pas défini côté serveur (retournerait 503 en fait — à vérifier).
2. La valeur de `WHATSAPP_VERIFY_TOKEN` dans Lovable Cloud ≠ celle saisie dans Meta Business Manager.
3. L'URL configurée dans Meta pointe vers preview au lieu de production (ou l'inverse), et le secret diffère entre les deux environnements.

## Étapes de vérification (lecture seule)

1. **Lister les secrets** (`fetch_secrets`) pour confirmer présence de :
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ADMIN_PHONE` (pour test d'envoi)

2. **Tester le handshake GET** via `curl` sur l'URL publiée :
   ```
   GET /api/public/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=ping
   ```
   - Sans token config → 503
   - Token faux → 403
   - Token correct → 200 + `ping`

3. **Tester un envoi WhatsApp sortant** via une petite server-fn admin temporaire OU via `notifyAdminWhatsApp` déjà présent, pour valider que `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` fonctionnent (retour Meta OK, `messages[0].id` présent).

4. **Vérifier logs** (`stack_modern--server-function-logs` filtré `whatsapp`) pour toute erreur.

## Livrables

- Diagnostic clair : lequel des 3 cas ci-dessus s'applique.
- Instruction précise pour l'utilisateur :
  - Soit re-saisir `WHATSAPP_VERIFY_TOKEN` (`update_secret`) et le recopier tel quel dans Meta → onglet WhatsApp → Configuration → Webhook.
  - Soit corriger l'URL du webhook dans Meta pour pointer sur `https://nexora-iptv.lovable.app/api/public/whatsapp/webhook`.
- Confirmation d'un envoi test réussi vers `WHATSAPP_ADMIN_PHONE`.

## Ce qui NE change pas

- Aucun code modifié (le handler est correct). Si le diagnostic révèle un bug (ex. 403 au lieu de 503 quand token absent), je proposerai un patch minimal dans un plan suivant.
