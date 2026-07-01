# Sprint 1.5 — Suite E2E chemin critique

Objectif : prouver bout-en-bout que `commande → paiement → workflow → livraison → /track` fonctionne.

## Pré-requis

Les scripts tournent depuis n'importe quel host Python 3 avec `playwright` installé.
Le sandbox Lovable a déjà tout ce qu'il faut (`PLAYWRIGHT_BROWSERS_PATH=/`).

Variables d'environnement **requises** (aucune n'est disponible dans le sandbox
preview par défaut — il faut les fournir à la main ou depuis une CI qui a
accès aux secrets Lovable Cloud) :

| Var | Rôle |
|-----|------|
| `E2E_BASE_URL`         | par défaut `http://localhost:8080` |
| `SUPABASE_URL`         | pour seed / assertions DB |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (contourne RLS) |
| `AUTOMATION_CRON_SECRET` | pour appeler `/api/public/automation/*` |
| `SEBPAY_SECRET_KEY`    | pour signer le webhook rejoué (scenario 2) |

## Lancer

```bash
cd tests/e2e/sprint-1.5
python3 01_happy_path.py       # scénario nominal (MEGAOTT désactivé pendant le run)
python3 02_webhook_replay.py   # webhook rejoué + signature invalide
# 03-real-megaott.md            # runbook manuel
```

Chaque script :
- écrit ses screenshots dans `./screenshots/`
- écrit son rapport JSON dans `./out/<scenario>.json`
- **nettoie** tout ce qu'il a créé (ordres `NXR-E2E-*`, comptes IPTV liés,
  logs) même en cas d'échec.

## Scénarios

- **01 happy-path** : seed order → émission `payment.confirmed` via
  `/api/public/automation/emit-test` → drain queue → assertions DB
  (`iptv_accounts`=1, `automation_runs.status=completed`, `delivery_logs>=1`)
  → ouverture `/track?ref=…` et screenshot.
- **02 webhook-replay** : POST du webhook 2× avec signature valide (attend 200
  + 2 receipts dans `integration_debug_logs`), puis 1× avec signature invalide
  (attend 401 + `signature_valid=false`). Prouve que la HMAC est bien vérifiée
  et qu'un replay ne crée jamais de double effet.
- **03 real-megaott** : checklist manuelle à jouer 1× par release avec un
  vrai token MEGAOTT.

## Nettoyage

`python3 helpers/cleanup.py` — supprime tout `NXR-E2E-*` orphelin. À lancer
si un script a crashé avant son teardown.