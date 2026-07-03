# Chaos suite — Sprint 3 · Bloc E

Trois scénarios de chaos volontairement isolés (aucun setUp partagé,
chaque script sait s'exécuter seul).

| Script | But | Env requis |
|---|---|---|
| `kill_provider.py` | Provisioning IPTV avec bearer MEGAOTT invalide | `NCC_BASE_URL`, session admin |
| `saturate_queue.py` | 200 events automation en < 5 s | `NCC_BASE_URL`, `AUTOMATION_CRON_SECRET` |
| `corrupt_webhook.py` | HMAC SebPay invalide + replay `event_id` | `NCC_BASE_URL`, `SEBPAY_SECRET_KEY` |

Chaque script :

- écrit un rapport JSON dans `tests/chaos/reports/<name>-<ts>.json`,
- exit `0` = SLO tenu, exit `!= 0` = régression.

`--dry-run` : simule sans appel réseau (utilisé par la CI PR).
Les scénarios réels tournent en nightly.