# Sprint 2 — Bloc C · Audit server functions & auth

_Livré : 2026-07-02 — base v1.0.0-RC1._

## C1 · Audit `createServerFn`

Inventaire des exports `createServerFn` par module (`src/lib/*.functions.ts`) :

| Module | Total | Protégés (`requireSupabaseAuth` / `requireAdmin`) | Publics assumés |
|---|---|---|---|
| `admin.functions.ts` | 16 | 13 (`requireAdmin`) + 1 (`requireSupabaseAuth` — `getMyAdminStatus`) | `hasAnyAdmin`, `bootstrapFirstAdmin`, `adminSignIn` |
| `automation.functions.ts` | 8 | 8 (`requireAdmin`) | — |
| `delivery.functions.ts` | 5 | 5 (`requireSupabaseAuth`) | — |
| `iptv.functions.ts` | 15 | 15 (`requireSupabaseAuth`) | — |
| `iptv-import.functions.ts` | 9 | 9 (`requireSupabaseAuth`) | — |
| `iptv-megaott.functions.ts` | 12 | 12 (`requireSupabaseAuth`) | — |
| `ncc.functions.ts` | 21 | 21 (`requireSupabaseAuth`) | — |
| `orders.functions.ts` | 4 | 0 | `createOrder`, `getOrderByRef`, `getOrdersByEmail`, `markOrderFailed` (HMAC) |
| `payments.functions.ts` | 2 | 0 | `initSebPayCheckout`, `verifyPayment` |
| `plans.functions.ts` | 1 | 0 | `getPublicPlans` |

### Justification des exports publics

- `plans.getPublicPlans` — lecture publique du pricing (`plans` table, policy `anon SELECT`).
- `orders.createOrder`, `orders.getOrderByRef`, `orders.getOrdersByEmail` — surface checkout / tracking anonyme (ref stockée par le client). Aucune donnée sensible dérivée hors ref.
- `orders.markOrderFailed` — sécurisé par token HMAC (finding `mark_order_failed_noauth` corrigé Bloc précédent).
- `payments.initSebPayCheckout` / `verifyPayment` — callbacks front SebPay ; toute mutation de statut passe par le webhook signé `/api/public/sebpay/webhook`.
- `admin.hasAnyAdmin` — utilisé pour piloter l'écran de bootstrap ; ne divulgue qu'un booléen.
- `admin.bootstrapFirstAdmin` — auto-verrouillé (échoue si un admin existe déjà).
- `admin.adminSignIn` — délivre les tokens uniquement si `has_role(admin)`; sinon `signOut()` sur le client éphémère.

## C2 · Middleware `requireAdmin`

- Fichier : `src/lib/require-admin.ts`.
- Compose `requireSupabaseAuth` puis appelle `has_role(_user_id, 'admin')` via `supabaseAdmin` (le rôle `authenticated` n'a pas d'`EXECUTE` sur `has_role`).
- Refacto appliqué :
  - `src/lib/admin.functions.ts` → 13 handlers passés de `requireSupabaseAuth` + `await ensureAdmin(...)` à `.middleware([requireAdmin])`. Fonction `ensureAdmin` supprimée.
  - `src/lib/automation.functions.ts` → 8 handlers passés à `.middleware([requireAdmin])` ; le helper `admin()` se limite à renvoyer `supabaseAdmin`.

Gain : garde-fou au niveau middleware (refus avant toute logique métier), plus de branchement conditionnel dans les handlers.

## C3 · Usage de `supabaseAdmin`

Règle : `@/integrations/supabase/client.server` ne doit **jamais** être importé au top-level d'un fichier `*.functions.ts` (le module est expédié dans le bundle client, seul le corps des handlers est strippé).

État actuel : Tous les usages dans `src/lib/*.functions.ts` sont sous `await import(...)` dans le corps d'un handler. Vérifié par `tests/rc2/no_admin_toplevel_test.py`.

Recommandation : garder `supabaseAdmin` réservé aux opérations privilégiées (Auth Admin API, bypass RLS pour agrégats admin).

## Definition of Done — Bloc C

- [x] `requireAdmin` disponible et utilisé par les modules admin.
- [x] Refacto `admin.functions.ts` + `automation.functions.ts`.
- [x] Aucun `supabaseAdmin` importé hors handler dans les `*.functions.ts` (test automatisé).
- [x] Documentation des exports publics assumés.