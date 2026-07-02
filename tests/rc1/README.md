# RC1 Certification Suite

Suite reproductible qui décide : **RC1 CERTIFIED – READY FOR PRODUCTION** ou
**RC1 NOT CERTIFIED**. Aucun changement du code applicatif — tout est
additif sous `tests/rc1/`.

## Pré-requis

Variables d'environnement (identiques à `tests/e2e/sprint-1.5/`) :

| Var | Rôle |
|-----|------|
| `E2E_BASE_URL`              | par défaut `http://localhost:8080` |
| `SUPABASE_URL`              | REST admin pour seed / assertions |
| `SUPABASE_SERVICE_ROLE_KEY` | contourne RLS (obligatoire) |
| `AUTOMATION_CRON_SECRET`    | pour `/api/public/automation/*` |
| `SEBPAY_SECRET_KEY`         | pour signer les webhooks rejoués |

Python 3 + `playwright` (déjà installé dans le sandbox Lovable).

## Lancer

```bash
bash tests/rc1/run-certification.sh
```

Sortie :

- `tests/rc1/out/RC1-REPORT.md`   — rapport officiel + verdict
- `tests/rc1/report/index.html`   — rapport HTML (scénarios, screenshots, durées, logs)
- `tests/rc1/out/*.json`          — artefacts détaillés (DB, logs, perf, chaîne workflow)

Le script sort en code **≠ 0** si le verdict est `RC1 NOT CERTIFIED` — utilisable en CI.

## Mapping tables demandé vs schéma réel

Le brief mentionne `payments` et `audit_logs`. Ces tables **n'existent pas** dans
le projet. Elles sont mappées explicitement :

| Demandé      | Vérifié dans                                                              |
|--------------|---------------------------------------------------------------------------|
| `payments`   | `orders` (`sebpay_reference`, `method`, `amount`, `currency`, `status`)   |
| `audit_logs` | `iptv_logs` + `automation_steps` + `integration_debug_logs`               |

## Format du rapport HTML

Le rapport HTML est généré par `checks/build-report.py` à partir des JSON produits
par chaque scénario (screenshots + steps + durées + logs). Ce n'est pas le
reporter natif `@playwright/test` — c'est un rapport équivalent piloté par le
wrapper Python déjà utilisé par la suite Sprint 1.5, pour ne pas dupliquer un
workspace npm.

## Critères de certification

`RC1 CERTIFIED` uniquement si :
- tous les scénarios pass ;
- 0 anomalie DB critique (`checks/db-integrity.py`) ;
- 0 anomalie logs critique (`checks/logs-audit.py`) ;
- chaîne de workflow OK pour chaque ref (`checks/workflow-chain.py`) ;
- perf totale médiane < `RC1_PERF_BUDGET_MS` (défaut 30000 ms).

Sinon `RC1 NOT CERTIFIED` avec la liste précise des blocages.