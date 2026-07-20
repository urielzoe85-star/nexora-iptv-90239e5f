## Objectif
Activer l'envoi d'emails via `notify.nexora-iptv.com` maintenant que les DNS sont en place.

## Étapes

1. **Vérifier le statut DNS** du domaine `notify.nexora-iptv.com` via `check_email_domain_status`.
2. **Exécuter `setup_email_infra`** — provisionne (idempotent) :
   - queues pgmq (`auth_emails`, `transactional_emails`)
   - RPC wrappers (`enqueue_email`, `read_email_batch`, etc.)
   - tables `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_state`
   - route `/lovable/email/queue/process` + cron pg_cron
   - vault secret pour la clé service-role
3. **Mettre à jour le sender par défaut** dans le code d'envoi (email delivery + notifications) : passer de `noreply@sent.nexora-iptv.com` / `send.nexora-iptv.com` à `noreply@notify.nexora-iptv.com` / `notify.nexora-iptv.com` dans :
   - `src/domain/providers/notifications.ts` (EmailChannel)
   - `src/lib/iptv-dispatch.server.ts` (sendEmailChannel)
   - toute autre référence trouvée à `sent.nexora-iptv.com` / `send.nexora-iptv.com` utilisée comme SENDER_DOMAIN
4. **Test rapide** : envoyer un email de test via le NCC (ou déclencher un dispatch) et vérifier `email_send_log` → status `sent`.

## Notes
- Si DNS pas encore vérifié, `setup_email_infra` reste exécutable ; l'envoi démarrera automatiquement dès la vérification.
- Les templates existants (`iptv-delivery`, `payment-failed`, etc.) restent inchangés.
- Aucun changement UI.
