# Intégration SebPay — documentation portable

Tout ce qui a été appliqué sur ce projet pour intégrer l'API SebPay (Mobile Money
Afrique de l'Ouest), rassemblé pour être rejoué sur un autre projet.

Documentation officielle : https://sebpay.bj/our-api

## Sommaire

| Fichier | Contenu |
| --- | --- |
| `01-configuration.md` | Secrets, base URL, endpoints, en-têtes d'authentification, callback |
| `02-api-reference.md` | Payloads, réponses, alias de champs, mapping des statuts |
| `03-webhook.md` | Réception du callback + vérification HMAC-SHA256 |
| `04-schema-donnees.md` | Colonnes/commandes et métadonnées nécessaires |
| `05-code-portable/` | Fichiers prêts à copier (serveur, checkout, verify, webhook) |
| `06-securite-et-tests.md` | Règles de sécurité + scénarios de test |
| `07-portage.md` | Checklist d'intégration dans un nouveau projet |

## Principe fondamental

> Le statut d'une commande ne provient **jamais** du client ni du corps du webhook.
> Il provient toujours d'un appel serveur → SebPay (`GET /api/v1/collections/{id}`).

Le webhook n'est qu'un **signal** : « va revérifier cette référence maintenant ».
Cela rend le système immunisé aux webhooks forgés, rejoués ou hors-ordre.

## Flux complet

```text
 1. Client remplit le checkout (montant, devise, téléphone, opérateur, pays)
        │
        ▼
 2. Commande créée en base           status = pending
        │
        ▼
 3. Serveur : POST {BASE}/api/v1/collections
       headers  X-Public-Key / X-Secret-Key
       body     amount, currency, phone, operator, country,
                external_reference (= order_ref), callback_url
        │
        ├─ réponse KO ─────────► erreur affichée, commande reste pending
        │
        ▼ réponse OK (transaction_id [, provider_link])
 4. Commande mise à jour            status = processing
                                    payment_provider   = "sebpay"
                                    provider_reference = transaction_id
        │
        ├── si provider_link → redirection navigateur vers SebPay
        └── sinon            → push USSD/MoMo sur le téléphone du client
        │
        ▼
 5a. SebPay POST {callback_url}          5b. Le front interroge verifyPayment()
     + header X-SebPay-Signature             toutes les N secondes
        │                                        │
        └──────────────┬─────────────────────────┘
                       ▼
 6. verifyPaymentInternal(order_ref)   (idempotent)
       - court-circuit si statut déjà terminal
       - GET {BASE}/api/v1/collections/{transaction_id}
       - mapping statut → paid | failed | cancelled | pending
       - UPDATE ... WHERE status IN ('pending','processing')   ← garde atomique
        │
        ▼
 7. Si transition effective : émission de l'événement métier
       payment.confirmed  ou  payment.failed  → livraison / facture / notifications
```

## Statuts et transitions

```text
pending ──init OK──► processing ──verify paid──────► paid      (terminal)
   │                     │        ──verify failed────► failed    (terminal)
   │                     │        ──verify cancelled─► cancelled (terminal)
   └──init KO──► pending (inchangé, réessayable)
```

Toute transition passe par `verifyPaymentInternal`, seul point d'écriture du
statut de paiement. La clause `.in("status", ["pending","processing"])` garantit
qu'un double webhook ne déclenche jamais deux fois la livraison.