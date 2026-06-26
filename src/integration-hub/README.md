# NEXORA Integration Hub (v1.3)

Point d'entrée unique pour toute communication avec un service externe.
Les modules métier (NCC, checkout, dashboard…) ne doivent jamais appeler
directement une API externe : ils passent par un connecteur enregistré
dans le hub.

## Architecture

```
src/integration-hub/
├── core/                    # Types & contrats partagés
│   ├── connector.ts         # Interface Connector + ConnectorStatus
│   ├── registry.ts          # Registre global des connecteurs
│   ├── result.ts            # Result<T, E> + helpers
│   ├── errors.ts            # IntegrationError hiérarchie
│   ├── secrets.ts           # SecretsManager (lecture serveur uniquement)
│   ├── logger.ts            # Logger structuré
│   └── monitoring.ts        # MetricsRecorder (latence, erreurs, dispo)
├── gateway/
│   └── api-gateway.ts       # Wrapper fetch: auth, timeout, retry, log, rate-limit
├── queue/
│   └── queue.ts             # Interface QueueDriver + InMemoryQueueDriver (dev)
├── webhooks/
│   ├── engine.ts            # Réception, vérif signature, retry, historique
│   └── signatures.ts        # HMAC helpers
├── connectors/
│   ├── payment/             # PaymentConnector + SebPay adapter (wrapper only)
│   ├── iptv/                # IPTVConnector interface (MEGAOTT, Xtream...)
│   ├── messaging/           # MessagingConnector (WhatsApp/Telegram/SMS)
│   ├── email/               # EmailConnector
│   ├── ai/                  # AIConnector
│   ├── storage/             # StorageConnector
│   ├── analytics/           # AnalyticsConnector
│   └── webhook/             # WebhookConnector (sortant)
└── index.ts                 # Bootstrap: enregistre les connecteurs par défaut
```

## Règles d'or

1. **Aucune régression.** Le flux SebPay existant (`src/lib/payments.functions.ts`,
   `src/routes/api/public/sebpay/webhook.ts`) reste inchangé. Le hub se
   contente de l'enregistrer comme premier fournisseur officiel.
2. **Aucune connexion réelle nouvelle.** Tous les connecteurs autres que
   SebPay sont des stubs (interfaces + adaptateur "not_implemented") prêts
   à recevoir une implémentation.
3. **Secrets serveur uniquement.** `SecretsManager` lit `process.env` et
   n'est jamais importable depuis du code client (fichiers `.server.ts`
   ou import dynamique dans un handler).
4. **Modulaire.** Ajouter un fournisseur = créer un adaptateur qui
   implémente l'interface + l'enregistrer dans `registerDefaultConnectors`.

## Connecteurs prévus

| Type        | Interface              | Fournisseurs prévus                                   | Statut v1.3 |
|-------------|------------------------|--------------------------------------------------------|-------------|
| Payment     | `PaymentConnector`     | SebPay, Stripe, PayPal, Orange Money, MTN MoMo, Crypto | SebPay enregistré (wrapper), reste = stub |
| IPTV        | `IPTVConnector`        | MEGAOTT, Xtream UI, Xtream Codes                       | Interfaces seulement |
| Messaging   | `MessagingConnector`   | WhatsApp Business, Telegram Bot, SMS, In-App           | Interfaces seulement |
| Email       | `EmailConnector`       | (Resend, SendGrid, SMTP custom…)                       | Interfaces seulement |
| AI          | `AIConnector`          | Lovable AI Gateway, OpenAI, Anthropic…                 | Interfaces seulement |
| Storage     | `StorageConnector`     | Supabase Storage, S3, R2…                              | Interfaces seulement |
| Analytics   | `AnalyticsConnector`   | PostHog, Plausible, GA4…                               | Interfaces seulement |
| Webhook     | `WebhookConnector`     | (sortants vers partenaires)                            | Interface + engine |

## Points d'extension

- **Nouveau fournisseur :** créer `connectors/<type>/<provider>.adapter.ts`,
  implémenter l'interface, l'enregistrer dans `registerDefaultConnectors`.
- **Nouveau type de connecteur :** ajouter un sous-dossier dans
  `connectors/` avec son interface + ses types métier.
- **Nouvelle file d'attente :** implémenter `QueueDriver` (Redis, pg-boss,
  SQS…) et remplacer `InMemoryQueueDriver` au bootstrap.
- **Monitoring externe :** implémenter `MetricsRecorder` (Datadog,
  Sentry…) et injecter au bootstrap.

## Recommandations pour les prochaines intégrations

1. Ne jamais importer un SDK tiers depuis un composant React.
2. Toujours router les appels sortants par `apiGateway.request(...)` —
   c'est lui qui apporte timeout, retry, journalisation et rate limit.
3. Vérifier la signature de tout webhook entrant dans le `WebhookEngine`
   avant tout traitement métier.
4. Stocker chaque nouveau secret via `add_secret` (jamais en clair dans
   le code) et le lire via `SecretsManager.require(...)`.
5. Les opérations longues (création IPTV, envoi de masse, sync) doivent
   passer par la `Queue` plutôt que de bloquer la requête HTTP.