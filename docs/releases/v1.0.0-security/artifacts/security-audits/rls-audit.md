# NEXORA™ ERP — Audit RLS & SECURITY DEFINER (Sprint 2 · Bloc A)

_Date : 2026-07-02 · Base : v1.0.0-RC1_

## 1. Résumé exécutif

| Objectif | Cible | État |
|---|---|---|
| G1 — RLS 100 % des tables `public` | 25/25, 0 policy `USING (true)` | ✅ atteint |
| G2 — Aucun SECURITY DEFINER exécutable par `anon`/`authenticated` sans `has_role` | ACL `postgres/service_role` uniquement | ✅ atteint |
| Linter Supabase | 0 finding `ERROR`/`WARNING` | ✅ 0 finding |

## 2. Inventaire tables `public` (25)

Toutes les tables ont `rowsecurity = true` et au moins une policy scopée.

| Table | Policies | Portée | Anon ? |
|---|---|---|---|
| automation_queue / runs / steps / workflows | 1 chacune | admin only (`has_role`) | ❌ |
| customers, customer_events | 1 | admin only | ❌ |
| delivery_logs | 2 (SELECT + INSERT admin) | admin only | ❌ |
| email_send_log | 3 (I/S/U service_role) | service_role only | ❌ |
| email_send_state | 1 (ALL service_role) | service_role only | ❌ |
| email_unsubscribe_tokens | 3 (I/S/U service_role) | service_role only | ❌ |
| integration_debug_logs | 2 (SELECT + INSERT admin) | admin only | ❌ |
| iptv_accounts / providers / import_batches / import_mappings | 1 chacune | admin only | ❌ |
| iptv_logs | 2 (SELECT + INSERT admin) | admin only | ❌ |
| notifications | 1 | admin only | ❌ |
| orders | 5 (CRUD admin + block anon INSERT) | admin only | ❌ |
| **plans** | 1 (SELECT `active=true`) | anon+authenticated | ✅ intentionnel (catalogue public) |
| products | 1 | admin only | ❌ |
| **site_settings** | 1 (SELECT `key IN ('contact','hero','social')`) | anon+authenticated | ✅ intentionnel (config publique) |
| subscriptions, trials | 1 chacune | admin only | ❌ |
| suppressed_emails | 2 (I/S service_role) | service_role only | ❌ |
| user_roles | 4 (SELECT self + CRUD admin) | authenticated (self) + admin | ❌ |

### Whitelist `anon` (justification)

- `plans` : liste des offres du site marchand (name, prix, description) — nécessaire aux pages `/catalog`, `/fr`, `/en`. Filtrée par `active = true`. Aucune donnée sensible.
- `site_settings` : uniquement les clés `contact`, `hero`, `social` (contenus éditoriaux publics). Toutes les autres clés (secrets, configs internes) sont inaccessibles.

Aucune autre exposition `anon`. Toutes les tables client, ordres, IPTV, logs et automation sont admin-only.

## 3. Fonctions SECURITY DEFINER (`public`)

| Fonction | ACL EXECUTE | Appelable par anon/auth ? | Note |
|---|---|---|---|
| `has_role` | postgres / service_role | ❌ direct, ✅ via policies (traversée) | Sécurité clé du modèle |
| `automation_claim_jobs` | postgres / service_role | ❌ | RPC cron interne |
| `delete_email` / `enqueue_email` / `read_email_batch` / `move_to_dlq` | postgres / service_role | ❌ | Wrappers pgmq |
| `email_queue_dispatch` / `email_queue_wake` | postgres / service_role | ❌ | REVOKE effectué (Sprint 1.5) |
| `verify_email_cron_secret` | postgres / service_role | ❌ | Vérif secret cron |

`set_updated_at` : trigger (pas SECURITY DEFINER) — comportement attendu.

## 4. Modifications appliquées ce sprint (Bloc A)

**Migration** — resserrage des policies email/service :

- `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` : les 7 policies auparavant déclarées `TO public` avec check `auth.role() = 'service_role'` sont réécrites `TO service_role USING (true)`.
- **Impact fonctionnel** : nul. `service_role` bypasse RLS ; les checks étaient déjà exclusifs. L'intent est désormais explicite dans l'inventaire.

## 5. Décisions et exclusions

- Aucune policy `USING (true)` en base — pas de whitelist à documenter.
- Aucune escalade de privilège identifiée via SECURITY DEFINER (toutes REVOKE de anon/auth par défaut Supabase).
- La table `iptv_accounts` contient les credentials fournisseurs (`m3u_url`, `password`) : accès admin-only strict — jamais exposée en lecture publique. Toute exposition Front doit passer par un `createServerFn` qui projette uniquement les colonnes safe (voir `getOrderByRef` dans `src/lib/orders.functions.ts`).
- `user_roles` : policy SELECT `user_id = auth.uid()` permet à un utilisateur de lire **ses propres** rôles uniquement (utile pour l'UI). L'écriture est admin-only.

## 6. Prochaines étapes (autres blocs)

- **Bloc B** — headers sécurité + HMAC unifié webhooks + rotation programmée des secrets cron/paiement.
- **Bloc C** — audit `createServerFn` mutations : middleware `requireAdmin` réutilisable.
- **Bloc D** — table `security_events` + alertes Telegram.
- **Bloc E** — harness pytest `tests/rc2/` : 1 test `anon`/`auth`/`admin` par policy.
- **Bloc F** — threat model + runbook + CHANGELOG RC2.

---

_Généré à partir de : `pg_class`, `pg_policies`, `pg_proc.proacl` + `supabase--linter`._