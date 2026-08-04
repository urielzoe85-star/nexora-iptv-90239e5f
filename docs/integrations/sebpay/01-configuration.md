# 1. Configuration

## 1.1 Secrets requis

| Nom de la variable | Format attendu | Usage |
| --- | --- | --- |
| `SEBPAY_PUBLIC_KEY` | `pk_live_…` ou `pk_test_…` | En-tête `X-Public-Key` |
| `SEBPAY_SECRET_KEY` | `sk_live_…` ou `sk_test_…` | En-tête `X-Secret-Key` **et** clé HMAC du webhook |

Règles de validation appliquées au chargement (voir `05-code-portable/sebpay.server.ts`) :

- valeur `trim()` + suppression des guillemets encadrants (`'` / `"`) — les copier-coller
  depuis un dashboard ou un `.env` en ramènent très souvent ;
- longueur minimale 20 caractères (détecte une clé tronquée) ;
- préfixe reconnu obligatoire (`pk_live_`/`sk_live_`/`pk_test_`/`sk_test_`) ;
- **les deux clés doivent être dans le même mode** : une clé publique `live` avec une
  secrète `test` produit des 401 opaques côté SebPay. On échoue tôt avec un message clair.

La clé publique peut aussi être exposée côté client si le front en a besoin
(`VITE_SEBPAY_PUBLIC_KEY`). **La clé secrète ne quitte jamais le serveur.**

## 1.2 Base URL et endpoints

```
BASE = https://newapi.sebpay.bj

POST  {BASE}/api/v1/collections              → créer une collecte Mobile Money
GET   {BASE}/api/v1/collections/{id_or_ref}  → vérifier le statut d'une collecte
```

`{id_or_ref}` = le `transaction_id` renvoyé à la création (encodé avec
`encodeURIComponent`). Le `external_reference` fonctionne également sur la
plupart des comptes, mais le `transaction_id` est le chemin fiable.

## 1.3 En-têtes d'authentification

```http
X-Public-Key: pk_live_xxxxxxxxxxxxxxxxxxxx
X-Secret-Key: sk_live_xxxxxxxxxxxxxxxxxxxx
Accept: application/json
Content-Type: application/json      # uniquement quand il y a un corps
```

Il n'y a **pas** de `Authorization: Bearer` : SebPay utilise ses deux en-têtes
propriétaires. Aucun jeton à rafraîchir, aucun OAuth.

## 1.4 Timeouts

| Appel | Timeout appliqué |
| --- | --- |
| `GET /collections/{id}` (verify) | 8 s |
| `POST /collections` (create) | 20 s |

Implémentés via `AbortController`. La création est plus longue car SebPay
déclenche le push opérateur de façon synchrone.

## 1.5 URL de callback

Le `callback_url` est transmis **à chaque création de collecte** — il n'y a rien à
configurer dans un dashboard. Il doit être :

- public, en HTTPS, joignable sans authentification ;
- capable de répondre en **moins de 5 s** (timeout documenté par SebPay) ;
- construit sur la même origine que le site pour rester cohérent avec les redirections :

```ts
const callbackUrl = `${new URL(successUrl).origin}/api/public/sebpay/webhook`;
```

Sur ce projet, tout ce qui vit sous `/api/public/*` est exempté de l'authentification
du site — c'est pour cela que le webhook y est placé.

## 1.6 Devises et pays

SebPay est utilisé ici pour le **Mobile Money Afrique de l'Ouest** (zone XOF/BJ,
opérateurs MTN, Orange, Moov, Wave). La devise envoyée est celle de la commande ;
vérifier auprès de SebPay les devises activées sur le compte marchand avant
d'ouvrir d'autres pays.