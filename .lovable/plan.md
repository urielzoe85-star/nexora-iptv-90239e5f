## Diagnostic

La file `automation_queue` contient **7 jobs `queued` avec 0 tentatives**, dont un `payment-confirmed` du 3 juillet 22:45 et un autre du même jour à 13:37. Résultat : les commandes `paid` récentes (NX-26X8KWHZ89, NX-LB6UV2822A) n'ont **jamais** été traitées → `orders.metadata.iptv_delivery` reste vide → l'écran client reste bloqué sur "compte pas encore attribué".

La logique métier est saine (workflow `payment-confirmed` bien câblé : create-subscription → compose delivery → dispatch multi-canal). Le problème est purement opérationnel : **le drainage de la file ne se déclenche pas de façon fiable**.

L'endpoint `/api/public/automation/process-queue` existe et fonctionne, mais il dépend uniquement d'un pg_cron externe protégé par `AUTOMATION_CRON_SECRET`. Si le cron est en panne / mal programmé / secret désynchronisé, **rien ne rattrape la file** — d'où l'accumulation observée.

## Objectif

Que "paiement confirmé → livraison IPTV visible sur /track" soit **quasi-instantané** (≤ 5 s en conditions normales) et **auto-récupérable** en cas de panne du cron.

## Plan

### 1. Déclenchement immédiat après paiement (chemin chaud)
Dans `src/lib/payments.functions.ts` (`verifyPayment` + validation manuelle Binance dans `src/routes/ncc.payments.binance.tsx`), **juste après avoir marqué la commande `paid`** et enqueue `payment-confirmed`, faire un `fetch()` fire-and-forget vers `/api/public/automation/process-queue` avec le `AUTOMATION_CRON_SECRET`. Cela draine la file dans la seconde qui suit le paiement, sans attendre le tick cron.

- Aucun blocage : `catch` silencieux, la file sera de toute façon rattrapée plus tard.
- Le secret est lu server-side (`process.env.AUTOMATION_CRON_SECRET`) ; jamais exposé au client.

### 2. Rattrapage périodique côté client sur /track
`src/routes/track.tsx` fait déjà du polling toutes les 1.2 s tant que la livraison n'est pas `sent`. Ajouter : si `order.status === "paid"` **et** aucune `delivery` après 15 s, appeler une **nouvelle serverFn `kickAutomationQueue(orderRef)`** qui, côté serveur, POST vers le drainer avec le secret. Idempotent (RPC `automation_claim_jobs` déjà `FOR UPDATE SKIP LOCKED`), rate-limité à 1 appel/10s par ref via `rate-limit.server.ts`.

### 3. NCC : panneau "Santé de la file automation"
Nouvelle carte dans `src/routes/ncc.automation.tsx` (ou `ncc.index.tsx` si déjà présent) affichant :
- Nombre de jobs `queued`, `processing`, `failed`
- Âge du plus vieux job `queued` (rouge si > 5 min)
- Bouton **"Drainer maintenant"** → serverFn admin qui POST vers le drainer
- Bouton **"Réessayer les failed"** → repasse les `failed` (ou seulement ceux < 24 h) en `queued`
- Bouton **"Attribuer maintenant"** sur chaque commande `paid` sans `iptv_delivery` (raccourci vers `composeIptvDelivery` + `dispatchIptvDelivery` en direct)

### 4. Requeue automatique des runs bloqués en `processing`
Le drainer courant ne libère jamais un job resté `processing` (crash du worker après claim). Ajouter une fonction SQL `automation_reclaim_stuck(_older_than_seconds int default 300)` qui remet `processing → queued` quand `locked_at < now() - interval`. Appelée en tête du drainer.

### 5. Backfill immédiat pour les 7 jobs actuellement bloqués
Une fois le déploiement effectué, un simple appel manuel au drainer (via le nouveau bouton NCC ou la CLI) rattrape toutes les commandes en attente : NX-26X8KWHZ89, NX-LB6UV2822A et les autres reçoivent leur fiche IPTV.

### 6. Tests
- E2E `tests/e2e/sprint-1.6/08_auto_dispatch_speed.py` : paiement simulé → assertion que `iptv_delivery` est présent en < 10 s (sans dépendre du cron).
- E2E `tests/e2e/sprint-1.6/09_queue_recovery.py` : simuler un job `processing` figé → vérifier qu'il repasse `queued` puis se termine.

## Détails techniques

**Fichiers créés**
- Migration SQL : fonction `automation_reclaim_stuck` + grant
- `src/lib/automation-kick.server.ts` : helper `kickAutomationQueue()` (POST interne avec secret)
- `src/components/admin/AutomationHealthCard.tsx`
- 2 scripts E2E Python

**Fichiers modifiés**
- `src/lib/payments.functions.ts` : kick après enqueue
- `src/routes/ncc.payments.binance.tsx` : idem après validation manuelle
- `src/routes/track.tsx` : appel `kickAutomationQueue` si paiement stagne
- `src/lib/automation.functions.ts` : serverFn `adminDrainQueue`, `adminRetryFailed`, `adminForceAttribute(orderRef)`
- `src/routes/api/public/automation/process-queue.ts` : appel `automation_reclaim_stuck` en tête + limite d'attempts remise à 3
- `src/routes/ncc.automation.tsx` : intégration du panneau santé

**Hors périmètre** (déjà OK, on n'y touche pas)
- Le workflow `payment-confirmed` lui-même
- La logique de dispatch (`iptv-dispatch.server.ts`)
- La builder de fiche (`iptv-delivery.builder.ts`)
- La page `/track` UI (juste ajout du kick)

## Résultat attendu

Après ce plan :
- Un paiement confirmé déclenche l'attribution IPTV **en moins de 5 s** (chemin chaud).
- Si le chemin chaud échoue, le polling `/track` relance le drain **au bout de 15 s**.
- Si tout échoue, le cron rattrape à la minute suivante.
- L'admin voit l'état de la file en un coup d'œil dans NCC et peut débloquer manuellement en un clic.
- Les 7 jobs actuellement coincés sont rejoués dès le premier drain.
