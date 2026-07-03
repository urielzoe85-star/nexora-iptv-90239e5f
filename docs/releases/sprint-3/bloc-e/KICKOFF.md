# Sprint 3 — Bloc E · Résilience

_Opened: 2026-07-03 · Target release: v1.0.0-ga_

## Portée (S3-P1-03, S3-P1-05)

Deux briques de résilience posées ensemble, réversibles indépendamment :

1. **Rotation automatisée des secrets** (S3-P1-03)
2. **Chaos suite** (S3-P1-05)

## Livrables

### 1. Rotation automatisée

- La table `public.secret_registry` + la fonction SECURITY DEFINER
  `public.secret_registry_scan()` (Bloc F du Sprint 2) alimentent déjà
  `security_events` avec `secret.expiring_soon` (warn, J-7) et
  `secret.expired` (critical, J+0). Le cron `secret-registry-scan-daily`
  tourne à 06:00 UTC.
- Endpoint `/api/public/hooks/secret-rotation-check` : wake HTTP idempotent
  (bearer `AUTOMATION_CRON_SECRET`) qui appelle la fonction, retourne le
  résumé `{expired, expiring_soon, scanned_at}` et permet un déclenchement
  hors-cron (script, GitHub Action, on-call).
- Runbook complet : `docs/security/secret-rotation.md` (rotation par
  secret, fenêtre de grâce, rollback, canary). Chaque rotation MUST mettre
  à jour `secret_registry.last_rotated_at` / `next_rotation_at`.
- Le "PR bot" du plan initial est remplacé par la publication d'une entrée
  `security_events` reprise par le bot Telegram : le on-call ouvre la PR
  manuellement en suivant le runbook. Justification : ouvrir des PRs
  automatiques nécessite un token GitHub côté worker, hors périmètre GA.

### 2. Chaos suite

`tests/chaos/` — trois scénarios exécutables (Python 3, `httpx`) :

| Script | Cible | Assertion clé |
|---|---|---|
| `kill_provider.py` | Simule MEGAOTT KO (bearer invalide) sur un provisioning IPTV | La commande passe en `provisioning_failed` + `security_events` `provider.down` |
| `saturate_queue.py` | Émet 200 events automation en < 5 s | La queue draine sous 30 s (SLO Sprint 3) sans perte |
| `corrupt_webhook.py` | Rejoue un webhook SebPay avec HMAC invalide, puis avec `event_id` déjà consommé | 401 sur HMAC KO ; 200 idempotent sur replay |

Chaque script exit `0` = SLO tenu, exit `≠0` = régression. Le rapport
JSON est écrit dans `tests/chaos/reports/<script>-<timestamp>.json`.

### 3. CI

`.github/workflows/sprint-3-bloc-e.yml` : typecheck + build + smoke chaos
(les scénarios réseau externes sont marqués `nightly` et hors de la CI PR
pour ne pas dépendre de SebPay / MEGAOTT sandbox).

## Validation

- `POST /api/public/hooks/secret-rotation-check` avec le bearer valide
  renvoie `200` + résumé JSON.
- Sans bearer → `401`. Bearer invalide → `401`. Rate limit dépassé
  (12 req/10 min) → `429`.
- Chaos smoke local : `python tests/chaos/saturate_queue.py --dry-run`
  passe.
- Une entrée `secret_registry` avec `next_rotation_at` passé produit une
  ligne `security_events` `secret.expired` critique dans les 24 h
  (naturellement via cron) ou immédiatement via l'endpoint.

## Rollback

- Rotation : désactiver l'endpoint = retirer le fichier route ; le cron
  Postgres reste, aucune perte.
- Chaos : suppression du dossier `tests/chaos/` (aucun impact runtime).

## Bloc suivant

Bloc F — Qualité GA (dashboards SLO, fuzzing Zod, load 100 rps, visual
regression Playwright).