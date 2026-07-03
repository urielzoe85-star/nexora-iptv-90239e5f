# Sprint 1.6 — Fiche de livraison IPTV (workflow officiel)

Tests E2E qui couvrent le workflow complet post-Sprint-1.5.

Prérequis (env) : `AUTOMATION_CRON_SECRET`, `PGHOST`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`.
Helpers réutilisent `tests/e2e/sprint-1.5/helpers/`.

Liste :
- `01_auto_assignment.py`
- `02_manual_assignment.py`
- `03_delivery_card_generation.py`
- `04_channel_email.py`
- `05_channel_whatsapp.py`
- `06_channel_telegram.py`
- `07_double_assignment_guard.py`
