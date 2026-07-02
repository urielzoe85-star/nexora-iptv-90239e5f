# Sprint 2 — Bloc E : garanties de gestion des administrateurs

## Objectifs certifiés

1. `adminAddAdmin` et `adminRemoveAdmin` sont entièrement auditables dans
   `public.security_events` (event_types `admin.role.granted`,
   `admin.role.revoked`, `admin.role.grant_failed`, `admin.role.revoke_blocked`).
2. Le dernier administrateur actif ne peut être ni supprimé ni rétrogradé.
3. Un administrateur ne peut pas révoquer son propre compte.
4. Toute modification de rôle passe par la RPC atomique
   `public.admin_change_role(actor, target, action)` — `SECURITY DEFINER`,
   `search_path=public`, verrou `SELECT ... FOR UPDATE` sur toutes les
   lignes `role='admin'` pour sérialiser les changements concurrents.
5. Chaque changement enregistre : `actor_user_id`, `target_user_id`,
   `request_id`, `route`, `old_role`, `new_role`, `admin_count`.

## Corrélation (`request_id`)

- Ajouté à `security_events` (colonne + index partiel).
- Injecté par `requireAdmin` (préfixe `adm_<uuid>`) et propagé dans le
  contexte des server functions.
- Extrait via `extractRequestMeta(request)` pour les webhooks (headers
  `cf-ray`, `x-request-id`, `x-correlation-id` acceptés en amont).

## Privilèges EXECUTE

| Rôle            | EXECUTE `admin_change_role` |
|-----------------|-----------------------------|
| anon            | ❌ révoqué                  |
| authenticated   | ❌ révoqué                  |
| service_role    | ✅ accordé                  |

## Tests automatisés

`tests/rc2/admin_role_change_test.py` — 15 checks :
- SECURITY DEFINER + search_path figé.
- Présence des guards SQL (`FOR UPDATE`, dernier admin, auto-révocation).
- Validation d'entrée (action inconnue, NULL).
- Privilèges EXECUTE.
- Schéma `security_events` (colonnes `request_id`, `target_user_id`).
- Contrat d'événements d'audit dans `src/lib/admin.functions.ts`.

Exécution :

```bash
DATABASE_URL="$SUPABASE_DB_URL" python3 tests/rc2/admin_role_change_test.py
```

Résultat attendu : `RESULT: all Bloc E guarantees hold ✅`.
