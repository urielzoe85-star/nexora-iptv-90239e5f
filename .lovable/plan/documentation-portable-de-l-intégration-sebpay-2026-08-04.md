# Documentation portable de l'intégration SebPay

Objectif : produire un dossier de documentation complet et autonome décrivant tout ce qui a été appliqué sur Nexora pour intégrer l'API SebPay, réutilisable tel quel dans un autre projet.

## Livrable

Un dossier `docs/integrations/sebpay/` contenant :

1. `README.md` — vue d'ensemble : flux complet (commande → création de collection → redirection client → webhook → vérification serveur → livraison), diagramme ASCII, statuts et transitions.
2. `01-configuration.md` — secrets requis (`SEBPAY_PUBLIC_KEY` / `SEBPAY_SECRET_KEY`, formats `pk_live_` / `sk_live_`, règle live/test cohérents), base URL `https://newapi.sebpay.bj`, endpoints `POST /api/v1/collections` et `GET /api/v1/collections/{id}`, en-têtes d'authentification `X-Public-Key` / `X-Secret-Key`, URL de callback à déclarer.
3. `02-api-reference.md` — payload exact de création (amount, currency, phone normalisé, operator slug mtn/orange/moov/wav, country, external_reference, callback_url), formes de réponse acceptées et alias de champs (transaction_id/id/reference, provider_link/payment_url/checkout_url/url), table de mapping des statuts SebPay → paid / failed / cancelled / pending.
4. `03-webhook.md` — réception du callback : vérification HMAC-SHA256 du corps brut avec la clé secrète et l'en-tête `X-SebPay-Signature`, comparaison en temps constant, rate-limit, ACK 200 systématique, idempotence, re-vérification serveur obligatoire (defense in depth), journalisation des échecs de signature.
5. `04-schema-donnees.md` — colonnes et champs nécessaires côté commandes (`order_ref`, `status`, `payment_provider`, `provider_reference`, `sebpay_reference`, `metadata.momo`, traces `sebpay_request` / `sebpay_response` / `sebpay_verify_response`), plus les événements métier émis après confirmation.
6. `05-code-portable/` — extraits de code prêts à copier, dérivés de l'implémentation actuelle et nettoyés de toute spécificité Nexora :
   - `sebpay.server.ts` : chargement/durcissement des clés, en-têtes, `sebpayFetch` avec timeouts et redaction des logs (téléphone masqué), normalisation téléphone/opérateur, mapping de statut.
   - `sebpay-checkout.functions.ts` : création de collection + passage de la commande en `processing`.
   - `sebpay-verify.server.ts` : vérification idempotente avec court-circuit sur état terminal.
   - `sebpay-webhook.route.ts` : route publique de webhook avec vérification de signature.
7. `06-securite-et-tests.md` — règles de sécurité appliquées (aucun nom de secret dans le bundle client, secrets lus uniquement dans les handlers serveur, imports dynamiques, logs masqués), plus les scénarios de test utilisés (happy path, rejeu de webhook, signature corrompue, indisponibilité du fournisseur) et un script de signature HMAC pour forger un webhook de test.
8. `07-portage.md` — checklist d'intégration dans un nouveau projet : différences si la stack n'est pas TanStack Start (équivalents Next.js route handler / Express / edge function), points à adapter (devises et pays supportés, routage multi-fournisseurs, déclenchement de la livraison après paiement).

## Notes techniques

La documentation est extraite de l'implémentation existante (`src/lib/payments-sebpay.server.ts`, `src/lib/payments.functions.ts`, `src/routes/api/public/sebpay/webhook.ts`, `src/integration-hub/webhooks/signatures.ts`, `src/integration-hub/connectors/payment/sebpay.adapter.ts`, `tests/e2e/sprint-1.5/helpers/signing.py`).

Aucun code applicatif existant n'est modifié : le plan n'ajoute que des fichiers de documentation. Aucune valeur de clé réelle n'est écrite dans la doc — uniquement les noms de variables d'environnement et les formats attendus.
