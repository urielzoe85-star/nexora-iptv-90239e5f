# 2. Référence API

## 2.1 Créer une collecte — `POST /api/v1/collections`

Corps exact envoyé par ce projet :

```json
{
  "amount": 12000,
  "currency": "XOF",
  "phone": "22997000000",
  "operator": "mtn",
  "country": "BJ",
  "external_reference": "NX-5Z7JB9M3YK",
  "callback_url": "https://exemple.com/api/public/sebpay/webhook"
}
```

| Champ | Règle de construction |
| --- | --- |
| `amount` | `Number(order.amount)` — jamais une chaîne |
| `currency` | code ISO de la commande (`XOF`, `EUR`, …) |
| `phone` | **normalisé** : tous les non-chiffres supprimés (`replace(/[^\d]/g, "")`) |
| `operator` | **slug** : voir table ci-dessous |
| `country` | code pays ISO-2 saisi au checkout (`BJ`, `CI`, `SN`, …) |
| `external_reference` | notre `order_ref` — **c'est la clé de corrélation**, unique et stable |
| `callback_url` | URL publique du webhook |

### Normalisation de l'opérateur

L'utilisateur choisit un libellé lisible (« MTN Mobile Money », « Orange Money »).
On le réduit à un slug attendu par SebPay :

| Libellé contient | Slug envoyé |
| --- | --- |
| `mtn` | `mtn` |
| `orange` | `orange` |
| `moov` | `moov` |
| `wav` / `wave` | `wav` |
| autre | libellé en minuscules, `trim()` |

### Réponse de création

SebPay enveloppe parfois la charge utile dans `data`, parfois non. On lit donc
`json.data ?? json`, puis on accepte plusieurs alias :

| Valeur cherchée | Alias acceptés (dans l'ordre) |
| --- | --- |
| identifiant transaction | `transaction_id`, `id`, `reference` |
| lien de paiement | `provider_link`, `payment_url`, `checkout_url`, `url` |
| statut initial | `status` (objet), puis `status` (racine) |
| message | `message` (objet), puis `message` (racine) |

`transaction_id` est **obligatoire** : sans lui on ne peut plus vérifier la
transaction, donc on échoue explicitement au lieu de laisser une commande
orpheline en `processing`.

`provider_link` est **optionnel** :

- présent → rediriger le navigateur (`window.location.assign`) ;
- absent → le client reçoit un push USSD/MoMo sur son téléphone ; on affiche un
  écran d'attente et on interroge `verifyPayment` en boucle.

### Gestion des erreurs

Est considéré comme échec : `status < 200 || status >= 300 || !json`.

Le détail est extrait dans cet ordre : `json.message`, `json.error`,
`json.detail`, puis les 500 premiers caractères du corps brut. `json.errors`
(erreurs de validation par champ) est journalisé séparément.

Le message renvoyé au client reste **générique** (« Le paiement n'a pas pu être
initialisé… ») ; le détail fournisseur ne va que dans les logs serveur.

## 2.2 Vérifier une collecte — `GET /api/v1/collections/{id}`

```ts
await sebpayFetch(`/api/v1/collections/${encodeURIComponent(transactionId)}`, { method: "GET" });
```

Statut lu dans l'ordre : `json.data.status`, `json.status`, `json.payment_status`.

### Mapping des statuts

| Statut SebPay (insensible à la casse) | Statut interne |
| --- | --- |
| `approved`, `success`, `successful`, `succeeded`, `paid`, `completed` | `paid` |
| `rejected`, `failed`, `failure`, `error`, `declined` | `failed` |
| `cancelled`, `canceled` | `cancelled` |
| tout le reste (y compris vide/inconnu) | `pending` |

Le défaut `pending` est volontaire : un statut inconnu ne doit jamais fermer une
commande. Un HTTP non-2xx sur le verify **ne modifie rien** — on renvoie le statut
courant et on retentera.