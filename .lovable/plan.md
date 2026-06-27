# NEXORA™ ERP – Version 1.6 — Automation Engine

Moteur d'automatisation **générique, extensible, sans modification du code existant**. Il s'appuie sur les services métier déjà en place (orders, payments SebPay, IPTV, MEGAOTT, Integration Hub) via une **API interne** et une couche d'événements.

## Architecture

```text
src/automation/
├── core/
│   ├── events.ts          // EventBus + catalogue typé des événements métier
│   ├── workflow.ts        // Types: Workflow, Trigger, Condition, Action, Step
│   ├── engine.ts          // Exécuteur (run, conditions, retry, journal)
│   ├── registry.ts        // Registre des workflows (id → définition)
│   ├── queue.ts           // Wrapper file d'attente (réutilise integration-hub/queue)
│   └── api.ts             // API interne: triggerEvent / runWorkflow / replay
├── actions/
│   ├── orders.actions.ts      // markPaid, markCompleted, generateInvoice…
│   ├── iptv.actions.ts        // createSubscription, renew, activate, suspend (stub MEGAOTT-ready)
│   ├── logs.actions.ts        // logStep
│   └── notifications.actions.ts // no-op (préparé v1.7)
└── workflows/
    ├── order-created.workflow.ts
    ├── payment-confirmed.workflow.ts
    ├── payment-failed.workflow.ts
    ├── subscription-renewal.workflow.ts
    ├── subscription-activate.workflow.ts
    └── subscription-suspend.workflow.ts
```

**Aucun fichier existant n'est modifié** sauf:
- `src/routeTree.gen.ts` (auto)
- branchements EventBus **non-intrusifs** : un seul `emit()` ajouté dans le webhook SebPay et le service orders, derrière un try/catch silencieux (zéro effet si l'engine est désactivé).

## Base de données (1 migration)

- `automation_workflows` : id, key (unique), name, description, enabled, trigger_event, definition (jsonb), created_at/updated_at
- `automation_runs` : id, workflow_id, workflow_key, trigger_event, payload (jsonb), status (pending|running|success|failed|cancelled), started_at, finished_at, duration_ms, error, actor_id
- `automation_steps` : id, run_id, step_index, name, status, started_at, finished_at, duration_ms, input (jsonb), output (jsonb), error
- `automation_queue` : id, workflow_key, payload (jsonb), status (queued|processing|done|failed), attempts, scheduled_at, locked_at, last_error

RLS : admin-only (lecture/écriture via `has_role(auth.uid(),'admin')`). GRANT authenticated + service_role.

## Server functions (admin-only)

`src/lib/automation.functions.ts` :
- `listWorkflows`, `toggleWorkflow`, `runWorkflowManually(key, payload)`
- `listRuns({ status?, workflow?, limit })`, `getRun(id)` (avec steps)
- `replayRun(id)` (relance depuis l'échec)
- `getAutomationKpis()` (actifs, exécutés 24h, erreurs, file d'attente, durée moyenne)

`src/lib/automation-events.functions.ts` (interne, utilisé par les modules) :
- `emitBusinessEvent({ event, payload, actor_id? })` → résout les workflows liés, les insère en `automation_queue` ou exécute synchronement selon config.

## API interne

`automationApi` exporté depuis `src/automation/index.ts` :
```ts
automationApi.emit(event, payload)
automationApi.run(workflowKey, payload)
automationApi.replay(runId)
```
Réutilisable par Telegram/WhatsApp/mobile/IA (futur).

## Événements catalogués

`order.created`, `payment.confirmed`, `payment.failed`, `customer.created`, `subscription.created`, `subscription.renewed`, `subscription.expired`, `trial.requested`, `support.ticket.created`. Extension = ajouter une clé au catalogue.

## Workflows livrés

1. **order-created** : log → enqueue payment-pending → log.
2. **payment-confirmed** : valider commande → `iptv.createSubscription` (via service domain existant, MEGAOTT-ready) → enregistrer infos → générer facture (stub) → `orders.markCompleted` → log toutes étapes.
3. **payment-failed** : marquer commande, journaliser.
4. **subscription-renewal** : `iptv.renew` → update expires_at → log.
5. **subscription-activate** / **subscription-suspend** : appels services IPTV, log.

Chaque étape : try/catch → step status persisté → si échec, run = `failed`, payload conservé pour replay.

## File d'attente

Driver SQL (table `automation_queue`) + worker exposé via route publique **sécurisée par apikey** :
- `src/routes/api/public/automation/process-queue.ts` (POST, anon apikey) — drainage batch (10 jobs, FOR UPDATE SKIP LOCKED).
- pg_cron toutes les minutes appelle cette route.

## UI NCC

- **`/ncc/automation`** (remplace placeholder actuel) : 3 onglets
  - *Workflows* : liste + toggle + bouton "Exécuter" (payload JSON).
  - *Historique* : table des `automation_runs` (workflow, statut, durée, date, erreur, bouton replay).
  - *Tableau de bord* : KPIs (actifs, runs 24h, erreurs, queue, durée moyenne).
- Carte "Automation" ajoutée au dashboard NCC principal (4 KPIs).

## Branchement non-intrusif

- Dans `src/routes/api/public/sebpay/webhook.ts` : après le traitement actuel, `automationApi.emit('payment.confirmed', {...}).catch(()=>{})`.
- Dans `src/lib/orders.functions.ts` création commande : idem `order.created`.
- Aucun comportement existant changé : si l'engine n'est pas câblé, le webhook continue.

## Documentation

`.lovable/phase-1.6.md` : événements, workflows, actions, API interne, file d'attente, exemples d'extension, recommandations v1.7+ (notifications, IA decisioning).

## Garanties

- SebPay : aucun fichier touché côté logique de paiement (seul un `emit` post-succès).
- MEGAOTT : passe par l'Integration Hub via les services `src/domain/iptv/services.ts`.
- Aucun parcours utilisateur ni route publique modifié.
- Engine 100 % testable manuellement via "Exécuter" sans déclencheur réel.

## Livraison

~20 fichiers nouveaux, 1 migration, 1 route publique cron, 2 branchements `emit()` d'une ligne chacun, 0 modification fonctionnelle.
