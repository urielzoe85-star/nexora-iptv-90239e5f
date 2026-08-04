# 4. Schéma de données

## 4.1 Colonnes de la table `orders`

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | uuid | clé interne |
| `order_ref` | text unique | référence publique, envoyée comme `external_reference` |
| `status` | text | `pending` → `processing` → `paid` / `failed` / `cancelled` |
| `amount` | numeric | montant envoyé à SebPay |
| `currency` | text | devise ISO |
| `method` | text | `momo`, `card`, `paypal`, … (SebPay = `momo`) |
| `email`, `full_name` | text | client (notifications post-paiement) |
| `payment_provider` | text | `sebpay` (permet un routage multi-fournisseurs) |
| `provider_reference` | text | `transaction_id` du fournisseur actif |
| `sebpay_reference` | text | `transaction_id` SebPay (colonne historique, conservée) |
| `metadata` | jsonb | entrées client + trace complète (voir ci-dessous) |

`sebpay_reference` est redondant avec `provider_reference` : c'est un héritage
d'avant le multi-fournisseurs. Sur un nouveau projet, **ne garder que
`provider_reference` + `payment_provider`**. Le fallback de lecture
`sebpay_reference ?? provider_reference` n'existe que pour les lignes anciennes.

## 4.2 Contenu de `metadata`

### Entrées client (écrites à la création de la commande)

```json
{
  "momo": {
    "phone": "+229 97 00 00 00",
    "operator": "MTN Mobile Money",
    "country": "BJ"
  }
}
```

Les trois champs sont **obligatoires** avant d'appeler SebPay ; sinon on renvoie
une erreur explicite demandant au client de ressaisir ses coordonnées de paiement.

### Trace d'intégration (écrite par le serveur)

| Clé | Contenu |
| --- | --- |
| `sebpay_endpoint` | URL complète appelée |
| `sebpay_request` | payload exact envoyé |
| `sebpay_response` | réponse JSON de création |
| `sebpay_provider_link` | lien de paiement ou `null` |
| `sebpay_initial_status` | statut renvoyé à la création |
| `sebpay_verify_response` | dernière réponse du `GET /collections/{id}` |
| `sebpay_verified_status` | statut brut fournisseur au moment de la transition |
| `verified_at` | horodatage ISO de la transition |

Cette trace rend chaque paiement auditable sans dépendre des logs runtime :
on sait exactement ce qui a été envoyé et ce que SebPay a répondu.

## 4.3 Garde d'écriture atomique

```ts
await supabaseAdmin
  .from("orders")
  .update({ status: mapped, metadata: { ...meta, /* trace */ } })
  .eq("order_ref", ref)
  .in("status", ["pending", "processing"])   // ← la garde
  .select("order_ref, email, plan_name, amount, currency");
```

Si le tableau renvoyé est vide, **aucune transition n'a eu lieu** (quelqu'un d'autre
l'a déjà faite) : on n'émet alors aucun événement métier. C'est ce qui empêche une
double livraison quand le webhook et le polling du front arrivent en même temps.

## 4.4 Événements métier émis

Uniquement en cas de transition effective :

| Statut mappé | Événement |
| --- | --- |
| `paid` | `payment.confirmed` |
| `failed` | `payment.failed` |
| `cancelled` | aucun |

Charge utile : `orderId`, `orderRef`, `email`, `planName`, `amount`, `currency`,
`provider`, `providerStatus`.

L'émission est **fire-and-forget avec clé d'idempotence** (`${event}:${orderRef}`)
et toute erreur est avalée après journalisation : le traitement d'un paiement ne
doit jamais échouer parce que la file d'automatisation est indisponible.

## 4.5 RLS

La table des commandes n'est jamais lue par la clé anonyme sur les chemins de
paiement : tous les accès passent par des fonctions serveur utilisant la clé de
service. Sur un nouveau projet, garder ce principe (RLS activée, aucune politique
`anon` en écriture sur `orders`) et exposer au client une projection restreinte
(`order_ref`, `status`) via une fonction serveur, pas un `SELECT` direct.