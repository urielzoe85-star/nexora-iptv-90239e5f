# NEXORA™ ERP — Phase 1.6 (Automation Engine)

## Vue d'ensemble

Moteur de workflows générique pour orchestrer les processus métier sans
intervention humaine. Toutes les nouvelles automatisations doivent passer
par ce moteur.

## Architecture

- `src/automation/core/events.ts` — catalogue typé des événements métier.
- `src/automation/core/workflow.ts` — types `WorkflowDefinition`, `WorkflowStep`, `WorkflowContext`.
- `src/automation/core/registry.ts` — registre des workflows code.
- `src/automation/core/engine.ts` — exécuteur (persiste runs + steps).
- `src/automation/core/api.ts` — `automationApi` (emit, run, replay, list).
- `src/automation/actions/*` — actions réutilisables (orders, iptv, logs, notifications no-op).
- `src/automation/workflows/*` — définitions des workflows livrés.
- `src/automation/index.ts` — bootstrap.

## Tables

| Table | Rôle |
|---|---|
| `automation_workflows` | Catalogue des workflows + flag `enabled`. |
| `automation_runs` | Une ligne par exécution (statut, durée, erreur). |
| `automation_steps` | Détail des étapes (input/output/erreur). |
| `automation_queue` | File d'attente asynchrone (driver SQL). |

RLS : admin uniquement (`has_role(auth.uid(), 'admin')`).

## Événements catalogués

`order.created`, `payment.confirmed`, `payment.failed`, `customer.created`,
`subscription.created`, `subscription.renewed`, `subscription.expired`,
`subscription.activated`, `subscription.suspended`, `trial.requested`,
`support.ticket.created`.

Ajouter un événement = ajouter une clé dans `BUSINESS_EVENTS`.

## Workflows livrés

| Clé | Déclencheur | Étapes |
|---|---|---|
| `order-created` | `order.created` | log → préparation paiement → log |
| `payment-confirmed` | `payment.confirmed` | validation commande → création abonnement IPTV → facture → mark completed → log |
| `payment-failed` | `payment.failed` | annulation commande → log |
| `subscription-renewal` | `subscription.renewed` | renouvellement IPTV → log |
| `subscription-activate` | `subscription.activated` | activation IPTV → log |
| `subscription-suspend` | `subscription.suspended` | suspension IPTV → log |

## API interne

```ts
import { automationApi } from "@/automation";

await automationApi.emit("payment.confirmed", { orderId });   // async (queue)
await automationApi.emit("payment.confirmed", { orderId }, { sync: true });
await automationApi.run("payment-confirmed", { orderId });    // manuel
await automationApi.replay(runId);                            // relance
```

Côté server function : `emitBusinessEvent`, `runWorkflowManually`,
`replayRunFn`, `listRuns`, `getRun`, `listWorkflows`, `toggleWorkflow`,
`getAutomationKpis` dans `src/lib/automation.functions.ts`.

## File d'attente

Driver SQL (table `automation_queue`). Drainage via la route publique
`/api/public/automation/process-queue` (auth par `apikey` anon). Un job
pg_cron toutes les minutes appelle cette route, traite jusqu'à 10 jobs et
retente jusqu'à `max_attempts` (3 par défaut).

## Gestion des erreurs

- Step en échec → statut `failed` persisté avec message + payload conservé.
- Run en échec → relance possible via UI (« Replay ») ou `automationApi.replay(runId)`.
- File d'attente : retry automatique, puis `failed` après `max_attempts`.

## UI NCC

`/ncc/automation` — onglets Tableau de bord, Workflows (toggle + exécuter),
Historique (détail des étapes + replay).

## Contraintes respectées

- **SebPay** : aucun fichier modifié. Les futurs branchements se feront via
  `automationApi.emit('payment.confirmed', …)` côté webhook, derrière un
  try/catch silencieux.
- **MEGAOTT** : les actions IPTV passent par les tables locales ; quand le
  connecteur réel sera configuré (phase 1.5 finalisée), les actions
  appelleront `iptvConnector.createSubscription`, `renew`, etc.
- **Architecture v1.3/v1.4** : Integration Hub réutilisé, aucune logique
  IPTV dupliquée.
- **Tests** : tous les workflows sont exécutables manuellement via l'UI
  « Exécuter » sans déclencheur réel.

## Recommandations v1.7+

- Notifications client (email/WhatsApp/Telegram) en remplacement du no-op.
- Constructeur visuel de workflows (drag & drop sur définitions stockées dans `definition` jsonb).
- Triggers DB (Supabase webhooks → `emitBusinessEvent`).
- Décisions IA via Lovable AI Gateway dans les conditions d'étape.
- Métriques OpenTelemetry vers la couche `monitoring` de l'Integration Hub.