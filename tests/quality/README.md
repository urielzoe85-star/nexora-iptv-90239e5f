# Quality suite — Sprint 3 · Bloc F

Trois axes de qualité GA, chacun exécutable en isolation.

| Script | But | Env requis |
|---|---|---|
| `fuzz/fuzz_public_endpoints.py` | Zod fuzz sur endpoints publics | `NCC_BASE_URL` |
| `load/checkout_100rps.py` | 100 rps / 60 s sur checkout + webhook | `NCC_BASE_URL` |
| `visual/visual_regression.py` | Diff pixel Playwright pages publiques | Chromium + baseline |

Chaque script :

- écrit un rapport JSON dans `tests/quality/reports/<name>-<ts>.json`,
- exit `0` = SLO tenu, exit `!= 0` = régression.

`--dry-run` : simule sans appel réseau (utilisé par la CI PR).
Les scénarios réels tournent en nightly contre le staging.

## SLO Sprint 3 (rappel)

- p95 checkout < 800 ms
- taux d'erreur < 0.5 %
- queue automation drain < 30 s
- 0 régression visuelle sur pages publiques