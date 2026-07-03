# Secret Rotation Runbook — NEXORA™ ERP

_Last updated: Sprint 2 · Bloc F_

This runbook documents how to rotate every secret used by the platform.
All secrets are stored in Lovable Cloud (Edge Function Secrets) and, for
SQL-side callers, mirrored into Supabase Vault.

## Inventory

| Secret | Where used | Rotation impact |
| --- | --- | --- |
| `SEBPAY_SECRET_KEY` | `verifyPaymentInternal`, SebPay webhook HMAC | Must be rotated in SebPay dashboard simultaneously; short window of 401s possible |
| `SEBPAY_PUBLIC_KEY` | Client-side checkout | Publishable; safe to expose |
| `MEGAOTT_BEARER_TOKEN` | `megaott.adapter.ts` upstream calls | New token must be minted in MegaOTT panel first, then swapped |
| `NCC_ACCESS_PASSWORD` | Back-office access gate | Notify all operators, ≥12 chars |
| `AUTOMATION_CRON_SECRET` | `automation/process-queue` bearer | Update pg_cron schedule payload in the same transaction |
| `EMAIL_CRON_SECRET` | Email queue dispatcher (Vault: `email_queue_cron_secret`) | Rotate Vault entry via SQL, then update caller |
| `email_queue_service_role_key` (Vault only) | `email_queue_wake` / `_dispatch` net.http_post | Only rotated on service role key rotation |
| `LOVABLE_API_KEY` | Lovable AI Gateway calls | Use `lovable_api_key--rotate_lovable_api_key` tool only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged writes | Managed by Lovable Cloud; not manually rotatable |

## Standard rotation procedure

1. Generate the new value in the upstream provider (or via `generate_secret` for internal signing secrets).
2. Store the new value with `update_secret` for the target name.
3. If the secret is also referenced from SQL (`email_queue_*`), update the Vault entry in the same window:
   ```sql
   SELECT vault.update_secret(id, '<new-value>')
   FROM vault.secrets WHERE name = 'email_queue_cron_secret';
   ```
4. Trigger a small canary call (webhook replay, cron manual run) and confirm it succeeds.
5. Revoke the old value upstream **after** verifying the new one.

## Cadence

- Payment (`SEBPAY_*`): every 90 days or on incident.
- Cron / internal HMAC (`AUTOMATION_CRON_SECRET`, `EMAIL_CRON_SECRET`): every 180 days.
- Provider bearers (`MEGAOTT_BEARER_TOKEN`): follow provider policy.
- Access gates (`NCC_ACCESS_PASSWORD`): on operator turnover.

## Rate limiting note

No standard rate-limiting primitive is enabled at the platform layer.
If a specific endpoint needs throttling, implement it ad-hoc in the
handler and document the decision here.

---

## Per-secret playbook (Bloc F)

Chaque entrée liste : **procédure** · **rollback** · **fenêtre de grâce** ·
**impact attendu** · **vérification post-rotation (canary)**.

### `SEBPAY_SECRET_KEY`
- **Procédure** : générer nouvelle clé côté portail SebPay → `update_secret`
  côté Lovable Cloud → mettre à jour `public.secret_registry.last_rotated_at`.
- **Rollback** : réactiver l'ancienne clé côté SebPay (fenêtre de grâce
  active) puis `update_secret` avec l'ancienne valeur.
- **Fenêtre de grâce** : SebPay accepte 2 clés simultanément pendant 15 min ;
  respecter cette fenêtre pour éviter les 401 sur webhook.
- **Impact** : aucun si respect de la fenêtre ; sinon rejet HMAC sur webhook.
- **Canary** : rejouer un webhook `payment.succeeded` via
  `tests/rc1/sebpay_replay.py` — statut attendu `200 OK` + entrée
  `integration_debug_logs.status='ok'`.

### `SEBPAY_PUBLIC_KEY`
- Publishable, exposée côté client. Rotation systématiquement couplée à (1).
- **Rollback** : simple re-déploiement avec l'ancienne valeur.
- **Canary** : ouvrir `/checkout`, vérifier absence d'erreur console.

### `MEGAOTT_BEARER_TOKEN`
- **Procédure** : générer nouveau token dans panel MEGAOTT (garder l'ancien
  actif) → `update_secret` → attendre 60 s (cache worker) → révoquer ancien.
- **Rollback** : réémettre l'ancien token côté MEGAOTT si encore en fenêtre,
  sinon générer un nouveau et pousser via `update_secret`.
- **Fenêtre de grâce** : ~10 min côté provider (à confirmer avant chaque
  rotation).
- **Impact** : échec temporaire des provisionings IPTV si fenêtre non
  respectée.
- **Canary** : lancer `tests/rc1/megaott_probe.py` — attendu `HTTP 200`
  + payload utilisateur.

### `NCC_ACCESS_PASSWORD`
- **Procédure** : notifier tous les opérateurs 24 h avant → `update_secret`
  (≥ 12 chars, aléatoire) → forcer déconnexion admin.
- **Rollback** : `update_secret` avec l'ancien mot de passe (garder chiffré
  hors-ligne 24 h).
- **Fenêtre de grâce** : aucune (single value) — planifier hors heures.
- **Impact** : tous les opérateurs doivent re-saisir le password.
- **Canary** : login admin de test.

### `AUTOMATION_CRON_SECRET`
- **Procédure** : `update_secret` → mettre à jour la charge du cron
  Postgres (`ALTER JOB` ou re-`cron.schedule`) dans la **même** transaction.
- **Rollback** : re-schedule le cron avec l'ancienne valeur ; `update_secret`
  avec l'ancienne.
- **Fenêtre de grâce** : aucune ; désaligner cron et worker = 401 sur
  `process-queue`.
- **Impact** : arrêt temporaire du drain automation (< 1 min si atomique).
- **Canary** : lancer manuellement
  `SELECT net.http_post(...)` avec le nouveau bearer, attendre `200`.

### `EMAIL_CRON_SECRET` (miroir Vault `email_queue_cron_secret`)
- **Procédure** :
  ```sql
  SELECT vault.update_secret(id, '<new>')
    FROM vault.secrets WHERE name = 'email_queue_cron_secret';
  ```
  puis `update_secret EMAIL_CRON_SECRET` côté Lovable Cloud.
- **Rollback** : ré-appliquer l'ancienne valeur des deux côtés.
- **Fenêtre de grâce** : accepter les 2 valeurs (variable
  `EMAIL_CRON_SECRET_LEGACY`) pendant 10 min si trafic élevé.
- **Impact** : jusqu'à 5 s de retard sur la queue email pendant l'update.
- **Canary** : `POST /lovable/email/queue/process` avec le nouveau bearer.

### `email_queue_service_role_key` (Vault only)
- Rotée automatiquement lors de la rotation `SUPABASE_SERVICE_ROLE_KEY` par
  Lovable Cloud. Ne pas rotater manuellement.
- **Canary** : `SELECT public.email_queue_dispatch();` — pas d'erreur.

### `LOVABLE_API_KEY`
- **Procédure** : outil `ai_gateway--rotate_lovable_api_key` **uniquement**.
- **Rollback** : rappeler l'outil (nouvelle rotation) — pas de retour arrière.
- **Fenêtre de grâce** : ~30 s propagation.
- **Impact** : envois email/alerts en échec pendant la propagation.
- **Canary** : `POST /lovable/email/transactional/preview`.

### `TELEGRAM_API_KEY`
- **Procédure** : régénérer côté BotFather → `update_secret`.
- **Rollback** : régénérer à nouveau (le token précédent est révoqué
  automatiquement par BotFather).
- **Fenêtre de grâce** : aucune (BotFather révoque immédiatement).
- **Impact** : bot Telegram muet ~10 s.
- **Canary** : `/status` sur le bot → réponse attendue.

### `SECURITY_ALERT_TELEGRAM_CHAT_ID`
- Identifiant non-secret ; rotation = changement de canal.
- **Canary** : émettre un `security_event` info et vérifier réception.

### `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_URL`
- Managés par Lovable Cloud ; rotation non manuelle. En cas de compromission
  → contacter Lovable Support. Le miroir Vault
  `email_queue_service_role_key` est mis à jour automatiquement.

---

## Vérifications post-rotation systématiques

À exécuter après **toute** rotation :

1. `python tests/rc2/secrets_leak_test.py` → exit 0.
2. `python tests/rc2/security_headers_test.py` → exit 0.
3. `SELECT * FROM public.security_events WHERE severity='critical' AND created_at > now() - interval '1 hour';` → 0 lignes non-expliquées.
4. Mettre à jour `public.secret_registry` :
   ```sql
   UPDATE public.secret_registry
      SET last_rotated_at = now(),
          next_rotation_at = now() + rotation_interval
    WHERE name = '<SECRET_NAME>';
   ```