# 3. Webhook SebPay

Route publique : `POST /api/public/sebpay/webhook`

SebPay signe chaque callback avec un **HMAC-SHA256 du corps brut** en utilisant
notre `SEBPAY_SECRET_KEY`, et transmet le digest hexadécimal dans l'en-tête
`X-SebPay-Signature`.

## 3.1 Séquence du handler

```text
1. Rate-limit par IP        60 req / 60 s   → 429 si dépassé
2. raw = await request.text()               ← IMPÉRATIF : corps brut, avant tout JSON.parse
3. Lire X-SebPay-Signature (insensible à la casse) → 401 si absent
4. Charger SEBPAY_SECRET_KEY (trim + guillemets) → 500 si absent
5. verifyHmac(secret, raw, signature)             → 401 si invalide
6. JSON.parse(raw)                                → 400 si invalide
7. Extraire la référence                          → 400 si absente
8. verifyPaymentInternal(ref)  (re-vérification serveur, idempotente)
9. Répondre 200 { ok: true } — TOUJOURS, même si le traitement a échoué
```

### Points non négociables

- **Signer/vérifier le corps brut**, jamais un objet re-sérialisé : `JSON.stringify`
  ne garantit pas l'ordre des clés ni l'espacement, la signature échouerait
  aléatoirement.
- **Comparaison en temps constant** (XOR sur tous les caractères, pas de `===`
  précoce) pour ne pas fuiter la signature attendue via un canal temporel.
- **ACK 200 systématique** après signature valide : une 5xx déclenche une tempête
  de rejeu chez SebPay. Les erreurs de traitement sont journalisées et
  réconciliées hors bande (cron de verify).
- **Idempotence** : `verifyPaymentInternal` court-circuite dès que la commande est
  dans un état terminal, et l'`UPDATE` est gardé par
  `WHERE status IN ('pending','processing')`. Un rejeu est donc un no-op.
- **On ne fait jamais confiance au `status` du webhook.** Il est uniquement
  journalisé ; l'état réel vient du `GET /collections/{id}`.

## 3.2 Extraction de la référence

```ts
const d = payload.data ?? payload;
const ref =
  d.external_reference ?? d.reference ?? d.order_ref ?? d.ref ?? payload.metadata?.reference;
```

`external_reference` est le champ documenté ; les alias couvrent les variantes de
charge utile observées.

## 3.3 Vérification HMAC (isomorphe, Web Crypto)

```ts
export async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHmac(secret: string, body: string, signatureHex: string): Promise<boolean> {
  const expected = (await hmacHex(secret, body)).toLowerCase();
  const provided = signatureHex.trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
```

> Utiliser **Web Crypto** et non `node:crypto` (`createHmac`). Sur une cible
> edge/Worker, `node:crypto` est résolu vers `__vite-browser-external` dès que le
> module devient accessible depuis le graphe client, et le build casse avec
> `"createHmac" is not exported by "__vite-browser-external"`.

## 3.4 Journalisation persistante

Chaque réception est écrite (best-effort, jamais bloquante) dans une table de logs
d'intégration avec : `connector_id`, `operation: "webhook"`, méthode, URL, statut
HTTP, `ok`, aperçu de la requête, `signature_valid`, erreur. Objectif : garder une
trace des échecs de signature et des rejeux au-delà de la rotation des logs runtime.

Les échecs de signature émettent en plus un événement de sécurité :

| Cas | Sévérité |
| --- | --- |
| en-tête `X-SebPay-Signature` absent | `warn` |
| signature invalide (mismatch HMAC) | `critical` |

Seule la **longueur** de la signature fournie est journalisée, jamais sa valeur.