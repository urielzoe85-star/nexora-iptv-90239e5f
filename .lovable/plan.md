## Lancer le test WhatsApp via curl

### Ce que tu vas faire
Envoyer une commande depuis ton terminal qui appelle la route `POST /api/public/whatsapp/test-send` sur ton site publié. Cette route est déjà déployée sur `nexora-iptv.lovable.app`. Elle demande à Meta WhatsApp d'envoyer un message texte de test à ton numéro `237656895003`.

### Étape 1 — Récupérer ton `WHATSAPP_VERIFY_TOKEN`
C'est la valeur que tu as enregistrée dans les secrets Lovable (utilisée aussi côté Meta pour valider le webhook).
- Si tu l'as toujours dans ton gestionnaire de mots de passe / notes → copie-la.
- Sinon, tu peux la remplacer par une nouvelle valeur (mais **il faudra alors la remettre à jour aussi dans la config webhook Meta** sinon la vérification webhook casse).

### Étape 2 — Ouvrir un terminal
Selon ton système :
- **Mac** : ouvre l'app *Terminal* (Cmd+Espace → tape "Terminal").
- **Windows** : ouvre *PowerShell* (menu Démarrer → tape "PowerShell").
- **Linux** : n'importe quel terminal.

`curl` est préinstallé sur les trois systèmes récents.

### Étape 3 — Lancer la commande
Colle ceci en remplaçant `TON_TOKEN_ICI` par ta vraie valeur de `WHATSAPP_VERIFY_TOKEN` :

```bash
curl -X POST "https://nexora-iptv.lovable.app/api/public/whatsapp/test-send?token=TON_TOKEN_ICI&to=237656895003"
```

Appuie sur Entrée.

### Étape 4 — Lire la réponse

**Succès attendu** — un JSON du type :
```json
{"ok":true,"status":200,"messageId":"wamid.HBgL...","error":null,"data":{...}}
```
Et un message WhatsApp arrive sur le `237656895003` dans les secondes qui suivent.

**Erreurs possibles** :
- `forbidden` (HTTP 403) → le `token` dans l'URL ne matche pas `WHATSAPP_VERIFY_TOKEN`. Recopie-le sans espace.
- `{"ok":false,"status":401,...}` → le nouveau `WHATSAPP_ACCESS_TOKEN` est rejeté par Meta (expiré ou mauvais scope).
- `{"ok":false,"status":400,"error":"Recipient phone number not in allowed list"}` → en mode dev Meta, le numéro doit être ajouté comme testeur dans Meta Business.
- `{"ok":false,"error":"(#131047) Message failed to send because more than 24 hours..."}` → hors fenêtre 24 h, il faudra passer par un template approuvé (pas bloquant pour valider l'API).

### Étape 5 — Me renvoyer le résultat
Copie/colle ici la réponse JSON complète (masque le `messageId` si tu veux). Je confirme que tout est OK et je remets à jour le `plan.md` avec le statut final.

### Alternative si tu n'as pas le `WHATSAPP_VERIFY_TOKEN`
Dis-le moi : je peux, en build mode, ajouter une petite route interne signée par un secret que je génère (jamais révélé), la publier, lancer le test moi-même, puis la supprimer.
