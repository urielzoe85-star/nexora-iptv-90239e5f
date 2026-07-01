# Sprint 1.5 — Rapport d'exécution E2E

> Template : dupliquer + renommer `sprint-1.5-report-YYYYMMDD.md` à chaque run.

## Contexte

- Date : YYYY-MM-DD
- Base URL testée : `E2E_BASE_URL`
- Commit : `git rev-parse HEAD`
- Testeur :

## Scénario 1 — Happy path

- [ ] `python3 tests/e2e/sprint-1.5/01_happy_path.py` sort code 0
- [ ] `out/01_happy_path.json` : `ok: true`
- [ ] Screenshot `screenshots/01_track_<ref>.png` : page /track affiche le
      badge "Compte créé" **et** "Identifiants envoyés" en vert.

Extraits DB à copier ici :
- `iptv_accounts.id` créé :
- `automation_runs.id` completed :
- `delivery_logs` count :

## Scénario 2 — Webhook rejoué

- [ ] `python3 tests/e2e/sprint-1.5/02_webhook_replay.py` sort code 0
- [ ] `valid_receipts = 2`, `invalid_receipts >= 1`, `iptv_accounts_created = 0`

## Scénario 3 — Run réel MEGAOTT

- [ ] Checklist `03-real-megaott.md` exécutée
- [ ] Utilisateur MEGAOTT visible côté panel
- [ ] Utilisateur MEGAOTT supprimé après vérification
- [ ] `helpers/cleanup.py` exécuté

## Anomalies rencontrées

_(à remplir)_

## Décision RC

- [ ] GO Sprint 1.6 / Sprint 2
- [ ] NO-GO — anomalies bloquantes à corriger avant :