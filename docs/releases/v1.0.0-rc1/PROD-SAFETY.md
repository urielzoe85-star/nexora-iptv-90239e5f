# RC1 — Vérification des éléments de test (prod-safety)

Audit systématique : aucun fichier, endpoint, stub ou configuration de test
ne peut être activé en production sans intervention explicite.

## 1. Endpoints test-only

| Endpoint | Garde | Comportement prod |
|---|---|---|
| `POST /api/public/automation/emit-test` | 3 gardes cumulées : (a) `ALLOW_E2E_ENDPOINTS=1`, (b) bearer `AUTOMATION_CRON_SECRET`, (c) `orderRef` doit matcher `^NXR-E2E-` | `ALLOW_E2E_ENDPOINTS` n'est **jamais** défini en production → renvoie `404 Not Found` avant toute lecture du body. Même en cas de fuite du cron secret, aucune commande client réelle ne peut être ciblée (prefix guard). |

La flag `ALLOW_E2E_ENDPOINTS=1` est exportée uniquement dans :
- `tests/rc1/run-certification.sh`
- CI (env spécifique au job de tests E2E)
- Dev local (setup manuel)

## 2. Stubs / modes simulés

| Élément | Activation | Neutralité prod |
|---|---|---|
| MEGAOTT mode simulé (`iptv.actions.megaott`) | Activé si aucun provider `megaott` **actif** en DB | En production, au moins un provider est actif → le mode simulé n'est jamais atteint. C'est un vrai fallback métier (dégradation contrôlée), pas un stub de test. |

## 3. Scripts / dossiers de test

Ne sont pas embarqués dans le bundle serveur/client :
- `tests/` (racine) — hors `src/`, jamais importé par le graphe de modules.
- `tests/rc1/` (harness, scénarios Python, checks).
- `tests/e2e/sprint-1.5/` (Playwright/Python).

Vérification : `rg -l "from tests|import tests" src/` → 0 résultat.

## 4. Secrets

- `AUTOMATION_CRON_SECRET` : requis en prod (cron pg + drain). Sa fuite ne suffit pas à activer `emit-test` (garde `ALLOW_E2E_ENDPOINTS`).
- `email_queue_cron_secret` : stocké Vault, RPC `verify_email_cron_secret` — jamais exposé.
- `SEBPAY_SECRET_KEY` : côté serveur uniquement, jamais loggé (audit `logs-audit.json` OK).

## 5. Données de seed test

- Préfixe canonique : `NXR-E2E-*` (order_ref).
- Cleanup final automatique après chaque run (`cleanup_e2e_refs`).
- `RC1_KEEP_DATA=1` disponible pour debug local uniquement.
- Aucun `NXR-E2E-*` ne doit exister en prod ; à ajouter au monitoring Sprint 2 (alerte).

## Conclusion

✅ Aucun élément de test n'est activable en production sans (a) modification du code déployé ou (b) définition explicite d'une variable d'environnement absente en prod.