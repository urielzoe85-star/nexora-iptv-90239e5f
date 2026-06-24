## Objectif

Quand l'admin clique « Confirmer le paiement » dans `/admin/orders`, la commande passe en `completed` (déjà en place) et l'email + WhatsApp partent. Aujourd'hui la page `/track` du client ne reconnaît que `paid` : elle reste donc bloquée sur l'étape « Paiement en cours de vérification » même après confirmation. Il faut :

1. Faire avancer le timeline client dès que le statut passe à `completed`.
2. Marquer automatiquement l'étape « Identifiants envoyés » comme validée 1 minute après le passage en `completed`.

## Changements

### `src/routes/track.tsx`

- Traiter `completed` comme un statut de paiement confirmé (équivalent à `paid` pour la logique de timeline et le badge).
- Remplacer la fenêtre d'activation actuelle de 10 min par **60 secondes** déclenchée à partir de `updated_at` quand le statut est `completed` (ou `paid`).
- Recalculer les étapes :
  - `confirmed` : `done` dès que statut ∈ {`paid`, `completed`}.
  - `provision` : `active` immédiatement après confirmation, `done` une fois les 60 s écoulées.
  - `delivered` : `done` une fois les 60 s écoulées.
- Conserver le polling toutes les 4 s tant que la fenêtre de 60 s n'est pas terminée, puis l'arrêter.
- Ajuster la barre de progression (« Activation ») pour refléter les 60 s au lieu de 10 min, et adapter les libellés (`track.activation.eta`, `track.activation.done`) côté affichage uniquement — pas de modif i18n nécessaire si le texte reste générique.
- Ajouter `completed` à `StatusBadge` (même style vert qu'`paid`).

### Aucune modif backend

`adminConfirmPayment` met déjà la commande en `completed` et déclenche email + WhatsApp. La temporisation d'1 min est purement visuelle côté client (basée sur `updated_at`), ce qui évite tout job programmé supplémentaire.

## Détails techniques

```text
status flow vu par /track
─────────────────────────
pending  →  auth (active)
paid     →  confirmed (done), provision (active), delivered après 60s
completed→  confirmed (done), provision (active → done à T+60s), delivered (done à T+60s)
```

- `ACTIVATION_MS = 60_000`
- `paidAt = (status === "paid" || status === "completed") ? new Date(updated_at).getTime() : null`
- `activated = paidAt && now - paidAt >= ACTIVATION_MS`
