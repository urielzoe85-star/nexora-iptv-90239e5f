# 6. Sécurité et tests

## 6.1 Règles de sécurité appliquées

### Étanchéité des secrets

| Règle | Raison |
| --- | --- |
| Aucun `import` statique du module SebPay depuis un fichier accessible au bundle client | un secret lu au niveau module fuiterait dans une chunk navigateur |
| Chargement uniquement par `await import(...)` **dans** le corps d'un handler serveur | le plugin server-fn supprime les corps de handler des chunks client |
| `process.env` lu à l'appel, jamais au niveau module | l'injection d'env se fait au moment de l'appel, pas au chargement |
| Noms d'env assemblés depuis des jetons (`["SEBPAY","SECRET","KEY"].join("_")`) | aucun littéral de nom de secret ne survit dans une chunk client |
| Suffixe de fichier `.server.ts` | bloqué du bundle client par la protection d'import |
| Seule la clé **publique** peut être exposée en `VITE_*` | la clé secrète est aussi la clé HMAC du webhook |

Test de non-régression exécuté en CI (`tests/rc2/secrets_leak_test.py`) : grep sur les
bundles produits pour vérifier qu'aucun nom ni valeur de secret SebPay n'y apparaît.

### Journalisation

- **Téléphone masqué** dans tous les logs (`redactSebpayPayload`) : seuls les 4
  derniers chiffres subsistent.
- **Clés jamais journalisées** : uniquement présence, longueur, préfixe (8 car.), mode.
- **Signature jamais journalisée** : uniquement sa longueur.
- Détail d'erreur fournisseur → logs serveur ; message générique → client.

### Surface d'attaque du webhook

| Contrôle | Effet |
| --- | --- |
| HMAC obligatoire | un webhook forgé est rejeté en 401 |
| Comparaison temps constant | pas d'oracle temporel sur la signature |
| Rate-limit 60/min/IP | pas d'amplification |
| Re-vérification serveur | même un webhook signé ne peut pas mentir sur le statut |
| Garde `status IN ('pending','processing')` | pas de double livraison sur rejeu |
| ACK 200 systématique | pas de tempête de rejeu |

## 6.2 Scénarios de test

### Happy path

1. Créer une commande `pending` avec `metadata.momo` complet.
2. Appeler `initSebPayCheckout` → attendre `transactionId` et `status = processing`.
3. Forger un webhook signé (voir 6.3) → attendre `200 { ok: true }`.
4. Vérifier `status = paid`, présence de `sebpay_verify_response` et
   `verified_at`, et déclenchement unique de l'événement `payment.confirmed`.

### Rejeu de webhook

Renvoyer **exactement** la même requête signée 3 fois. Attendu : trois `200`,
un seul événement métier, une seule livraison.

### Signature corrompue

Altérer un caractère de la signature, ou du corps sans re-signer. Attendu :
`401`, aucune modification de la commande, événement de sécurité `critical`.

### En-tête de signature absent

Attendu : `401`, événement de sécurité `warn`.

### Indisponibilité du fournisseur

Simuler un timeout ou un 5xx SebPay sur le verify. Attendu : la commande reste
`processing`, aucune écriture, retentable. Sur la création, la commande reste
`pending` et le client peut réessayer.

### Statut inconnu

Renvoyer un `status` non répertorié. Attendu : mappé en `pending`, commande
laissée en `processing` (jamais fermée par erreur).

## 6.3 Forger un webhook de test (HMAC)

Python (utilisé dans les tests E2E de ce projet) :

```python
import hmac, hashlib, json, os

def sebpay_signature(raw_body: str) -> str:
    secret = os.environ["SEBPAY_SECRET_KEY"].strip().strip("'\"")
    return hmac.new(secret.encode(), raw_body.encode(), hashlib.sha256).hexdigest()

def build_webhook(ref: str, *, status: str = "successful", transaction_id: str | None = None):
    payload = {
        "transaction_id": transaction_id or f"txn_{ref}",
        "external_reference": ref,
        "status": status,
        "currency": "EUR",
        "amount": 1.00,
    }
    # Le corps envoyé DOIT être exactement la chaîne signée.
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return raw, sebpay_signature(raw)
```

Envoi :

```bash
curl -sS -X POST "$BASE/api/public/sebpay/webhook" \
  -H "Content-Type: application/json" \
  -H "X-SebPay-Signature: $SIG" \
  --data-binary "$RAW"
```

Équivalent Node :

```js
import { createHmac } from "node:crypto"; // OK dans un script local, PAS dans le Worker
const raw = JSON.stringify(payload);
const sig = createHmac("sha256", process.env.SEBPAY_SECRET_KEY).update(raw).digest("hex");
```

> `--data-binary` (et non `-d`) : `curl -d` peut réécrire le corps et invalider
> la signature.