## Diagnostic (vérifié via `email_send_log` + statut domaines)

Le bouton **Test** de Cloud → Emails fonctionne parce qu'il utilise le domaine du projet, qui est **`account.nexora-iptv.com`** (sous-domaine expéditeur `notify.account.nexora-iptv.com`, seul domaine vérifié pour ce projet).

Toutes les autres routes d'envoi (NCC → Notifications, NCC → Services, livraison IPTV, bulk) codent en dur `notify.nexora-iptv.com` comme `sender_domain`. Ce domaine n'est **pas vérifié** sur ce projet → le processor renvoie `403 domain_not_verified` et le message file en DLQ. Deux échecs de ce type ce soir (22:02 et 22:04 UTC) sur `urielzoe85@gmail.com`, template `ncc-notification`.

WhatsApp et Telegram utilisent les bons secrets (WHATSAPP_ACCESS_TOKEN / TELEGRAM_API_KEY présents). Si un envoi échoue, c'est côté destinataire (numéro / chat_id manquant sur la commande) — la couche envoi elle-même est saine. Une fois le canal email réparé, on re-teste WA/TG et on complète seulement si un vrai échec remonte.

## Fix

Remplacer partout la paire hardcodée :
- `from: "Nexora IPTV <noreply@notify.nexora-iptv.com>"` → `noreply@notify.account.nexora-iptv.com`
- `sender_domain: "notify.nexora-iptv.com"` → `notify.account.nexora-iptv.com`

Fichiers concernés (4) :
1. `src/domain/providers/notifications.ts` (NCC → Notifications — cause directe des DLQ observés)
2. `src/lib/delivery.functions.ts` (NCC → Services / Composer, `sendEmailAuto`)
3. `src/lib/iptv-dispatch.server.ts` (dispatch multi-canal payment-confirmed)
4. `src/lib/bulk-send.functions.ts` (envoi en masse)

Aucun changement de logique, seul le domaine expéditeur change. Templates, files pgmq, cron, RLS, `email_send_log` restent identiques.

## Nettoyage & vérification

1. Reprocess ou marquer `failed` les entrées DLQ récentes `ncc-notification` du 20 juillet (elles ne peuvent pas partir avec l'ancien domaine).
2. Envoyer un email test depuis NCC → Notifications sur `urielzoe85@gmail.com` et vérifier `email_send_log.status = 'sent'`.
3. Tester un envoi WhatsApp et Telegram depuis NCC → Services sur une commande ayant `phone` + `metadata.telegram_chat_id`. Si erreur, on ouvrira un correctif ciblé avec le message provider exact — pas de spéculation avant.

## Détails techniques

Le domaine du projet est fixé au niveau Cloud (`account.nexora-iptv.com`), pas modifiable via code. `notify.nexora-iptv.com` reste en `initiated` (jamais validé) — ne pas essayer de l'utiliser tant que la vérification DNS n'aboutit pas.
