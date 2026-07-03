# Sprint 3 — Bloc F · Qualité GA

_Opened: 2026-07-03 · Target release: v1.0.0-ga_

## Portée (S3-P2-01 → S3-P2-04)

Dernier bloc avant la certification GA. Quatre briques qualité posées
ensemble, réversibles indépendamment.

## Livrables

### 1. Dashboard SLO (S3-P2-01)

- Endpoint `/api/public/hooks/slo-snapshot` (bearer
  `AUTOMATION_CRON_SECRET`, 30 req/5 min/IP) qui renvoie :
  - `errors_critical_last_hour` / `errors_warn_last_hour`
    (agrégés depuis `security_events`)
  - `queue_depth` (`automation_queue` en `pending` + `processing`)
  - cibles SLO (p95 800 ms, error rate 0.5 %, queue drain 30 s)
- Consommé par Grafana / Metabase / bot d'astreinte.
- Pas de UI dédiée dans l'app : c'est un signal machine-to-machine.

### 2. Fuzzing Zod (S3-P2-02)

`tests/quality/fuzz/fuzz_public_endpoints.py` — envoie 8 payloads
malformés (vide, JSON tronqué, bytes binaires, JSON géant) sur les
endpoints publics et exige un 4xx. Un 5xx = schéma trop permissif ou
handler qui crash → régression.

### 3. Load test (S3-P2-03)

`tests/quality/load/checkout_100rps.py` — 100 rps / 60 s sur checkout
et webhook. SLO GA :

- p95 < 800 ms
- error rate < 0.5 %
- 0 réponse 5xx

### 4. Visual regression (S3-P2-04)

`tests/quality/visual/visual_regression.py` — Playwright, diff pixel
(Δ ≤ 0.2 %) sur `/`, `/fr`, `/en`, `/catalog`, `/legal/*`. Baseline
dans `tests/quality/visual/baseline/`.

### 5. CI

`.github/workflows/sprint-3-bloc-f.yml` : typecheck + build + smoke
dry-run des trois scripts. Runs live = nightly contre staging.

## Validation

- `GET /api/public/hooks/slo-snapshot` avec bearer valide → 200 + JSON.
- Sans bearer → 401. Bearer invalide → 401. Rate limit → 429.
- Smoke local : `python tests/quality/fuzz/fuzz_public_endpoints.py --dry-run`
  + `python tests/quality/load/checkout_100rps.py --dry-run`
  + `python tests/quality/visual/visual_regression.py --dry-run` — tous
  exit 0.

## Rollback

- SLO snapshot : retirer le fichier route ; aucune donnée persistée.
- Quality suite : suppression du dossier `tests/quality/` (aucun impact
  runtime).

## Bloc suivant

GA — Certification `v1.0.0-ga` :

1. Rejouer RC1 + RC2 + smoke Bloc A→F.
2. Signer artefacts (Bloc D).
3. Rédiger `docs/releases/v1.0.0-ga/CERTIFICATION.md`.
4. Tag `v1.0.0-ga`.