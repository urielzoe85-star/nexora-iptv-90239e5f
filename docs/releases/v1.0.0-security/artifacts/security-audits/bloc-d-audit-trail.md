# Sprint 2 — Bloc D · Audit trail & alertes

_Livré : 2026-07-02 — base v1.0.0-RC1._

## D1 · Table `public.security_events`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `event_type` | `text` | ex. `auth.admin.signin_failed`, `webhook.sebpay.signature_invalid` |
| `severity` | `text` | `info` \| `warn` \| `critical` (CHECK) |
| `actor_user_id` | `uuid` FK `auth.users` NULL | ON DELETE SET NULL |
| `actor_email` | `text` NULL | conservé lorsqu'il n'y a pas encore d'`auth.users` (adminSignIn refusé) |
| `route` | `text` NULL | route ou nom de fonction serveur |
| `ip`, `user_agent` | `text` NULL | extraits via `extractRequestMeta()` |
| `message` | `text` | résumé court (≤ 400 chars pour Telegram) |
| `payload` | `jsonb` | contexte structuré libre |
| `created_at` | `timestamptz` | `now()` |

Index : `(created_at DESC)`, `(event_type, severity, created_at DESC)`, `(actor_user_id, created_at DESC)`.

### RLS

- `SELECT` : `authenticated` + `has_role(admin)` uniquement.
- `INSERT` : `service_role` uniquement (aucune policy `authenticated`/`anon`).
- `UPDATE` / `DELETE` : aucune policy → refusés par défaut, même pour les admins. Le journal est append-only.

## D2 · Helper `recordSecurityEvent`

Fichier : `src/lib/security-events.server.ts` (server-only, à charger via `await import(...)`).

```ts
await recordSecurityEvent({
  event_type: "auth.admin.forbidden",
  severity: "warn",
  actor_user_id: userId,
  message: "Non-admin user attempted to call an admin-only server function",
});
```

Propriétés :

- Ne throw jamais (log + swallow) → l'audit ne casse pas la logique métier.
- Redaction email / IP dans les alertes Telegram (`abc***`, `192.16***`).
- Payload borné à 400 caractères pour le corps Telegram.

## D3 · Alerte Telegram

- Activée quand `SECURITY_ALERT_TELEGRAM_CHAT_ID` est défini côté serveur.
- Réutilise le connecteur Telegram existant (`LOVABLE_API_KEY` + `TELEGRAM_API_KEY`).
- Envoyée pour `severity ∈ { warn, critical }`.
- Format HTML : `event_type`, sévérité, route, acteur (email masqué), IP masquée, message court.

Pour activer les notifications en production :

1. Vérifier que le connecteur Telegram est lié (`standard_connectors--list_connections`).
2. Définir `SECURITY_ALERT_TELEGRAM_CHAT_ID` (secret) avec l'ID de la conversation ou du canal admin.
3. Un événement `warn` déclenché (ex. non-admin qui tente un appel réservé) doit apparaître dans le canal en < 5 s.

## D4 · Points d'intégration Sprint 2

| Emplacement | Événements émis |
|---|---|
| `src/routes/api/public/sebpay/webhook.ts` | `webhook.sebpay.signature_missing` (warn), `webhook.sebpay.signature_invalid` (critical) |
| `src/lib/require-admin.ts` | `auth.admin.forbidden` (warn), `auth.admin.check_error` (warn) |
| `src/lib/admin.functions.ts::adminSignIn` | `auth.admin.signin_failed` (warn), `auth.admin.signin_not_admin` (critical), `auth.admin.signin_success` (info) |

### Extensions naturelles (Sprint 2+)

- Webhook MegaOTT : à instrumenter lors de la mise en place effective (aujourd'hui stub simulé).
- Rotation des secrets Vault : émettre `secret.rotation.executed` (info) à chaque `verify_email_cron_secret` échec (critical).
- Suppression / promotion d'admin : ajouter `role.admin.granted` / `role.admin.revoked` dans `adminAddAdmin` / `adminRemoveAdmin` (Bloc E).

## D5 · Rétention

Aucune purge automatique sur RC1 (append-only). À planifier pour Sprint 2 Bloc F (housekeeping) : suppression `severity = 'info'` > 90 jours, archivage `warn`/`critical` > 365 jours.

## Definition of Done — Bloc D

- [x] Table `security_events` créée avec RLS append-only.
- [x] Helper `recordSecurityEvent` server-only + redaction Telegram.
- [x] 3 points d'intégration critiques instrumentés (webhook SebPay, requireAdmin, adminSignIn).
- [x] Alerte Telegram opt-in via `SECURITY_ALERT_TELEGRAM_CHAT_ID`.
- [x] Documentation d'activation & extensions à venir.