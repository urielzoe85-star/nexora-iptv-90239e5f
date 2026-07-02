# Sprint 2 — Security Certification Report

_Release: **v1.0.0-security**_
_Date: 2026-07-02_
_Verdict: **CERTIFIED ✅**_

---

## 1. Résumé exécutif

Sprint 2 a livré le durcissement complet de la plateforme NEXORA™ ERP sur
six axes (Blocs A → F), sans régression fonctionnelle. Le périmètre
RC1 (paiement → provisioning IPTV → livraison → email → tracking) est
conservé et désormais protégé par une couche de sécurité homogène :

- **Autorisation** : chaque endpoint privilégié est gardé par
  `requireAdmin` ou par une vérification HMAC signée.
- **Isolation données** : RLS activé sur 100% des tables `public` avec
  matrice de GRANT explicite.
- **Traçabilité** : chaque événement sensible est journalisé dans
  `public.security_events` et relayé Telegram si `severity ≥ warn`.
- **Secrets** : inventaire exhaustif, rotation documentée par secret,
  détection de fuite en CI, cron d'alerting d'expiration.

Aucune fuite détectée sur le repo, le bundle client, les artefacts ou les
logs. Aucune faille critique ouverte.

## 2. Architecture de sécurité actuelle

```text
┌────────────────────────────────────────────────────────────────────┐
│                         Edge (Cloudflare)                          │
│   Security headers · HSTS · X-Frame · X-Content-Type · Ref-Policy  │
└──────────────┬─────────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────┐     ┌──────────────────────────────┐
│  TanStack Start Worker        │────▶│  Lovable Cloud (Supabase)   │
│  - createServerFn (RPC)       │     │  - RLS 100% · has_role()    │
│  - requireSupabaseAuth        │     │  - admin_change_role RPC    │
│  - requireAdmin middleware    │     │  - security_events table    │
│  - HMAC verify (webhooks)     │     │  - secret_registry + cron   │
│  - secret-guard.server.ts     │     │  - Vault (email_queue_*)    │
└──────────────┬───────────────┘     └──────────────┬───────────────┘
               │                                     │
       audit trail                                Telegram alerts
               │                                     │
               └────────► public.security_events ◄───┘
```

**Frontières de confiance** :
1. Client (browser) → uniquement clés publishable, aucune écriture privilégiée.
2. Worker (server functions) → lit env secrets, appelle Supabase avec le
   bearer utilisateur (RLS s'applique).
3. Worker admin path → charge `supabaseAdmin` en lazy import (bypass RLS)
   après `requireAdmin` uniquement.
4. SQL SECURITY DEFINER → seul chemin autorisé pour lire `vault.decrypted_secrets`.

## 3. Modules sécurisés (couverture)

| Module | Contrôle | Statut |
|---|---|---|
| Paiement SebPay (webhook + verify) | HMAC + `noteSecretUse` + audit | ✅ |
| Provisioning MEGAOTT | Bearer secret + secret-guard + logs | ✅ |
| Automation queue (`process-queue`, `emit-test`) | HMAC + kill-switch `ALLOW_E2E_ENDPOINTS` | ✅ |
| Email queue (Vault) | `email_queue_cron_secret` via Vault | ✅ |
| Transactional email (`/lovable/email/*`) | `requireAdmin` | ✅ |
| Admin CRUD (`admin.*`) | `requireAdmin` + `admin_change_role` RPC | ✅ |
| NCC back-office | `requireAdmin` sur toutes fonctions mutation | ✅ |
| Auth (Supabase) | Politiques RLS + `has_role()` | ✅ |
| Telegram webhook | Token URL + validation payload | ✅ |
| SEO / public pages | Aucun secret, headers durcis | ✅ |

## 4. Couverture des tests

| Test | Portée | Résultat |
|---|---|---|
| `tests/rc2/secrets_leak_test.py` | Repo + bundle + build + logs + artefacts | ✅ 0 hit |
| `tests/rc2/security_headers_test.py` | 5 endpoints publics | ✅ (env publiée) |
| `tests/rc2/no_admin_toplevel_test.py` | 10 `*.functions.ts` | ✅ 0 hit |
| `tests/rc2/admin_role_change_test.py` | 15 scénarios (self-demote, last-admin, race) | ✅ 15/15 |
| `tests/e2e/sprint-1.5/*` | RC1 nominal + webhook replay | ✅ inchangé |
| Suite RC1 certification | Chaîne complète paiement → livraison | ✅ inchangé |

**Non couvert par automatisation** (accepté — voir §5) :
- Chaos testing (perte réseau, latence provider).
- Fuzzing des inputs Zod.
- Test de charge (> 100 rps).

## 5. Risques résiduels

| # | Risque | Sévérité | Mitigation actuelle | Backlog Sprint 3 |
|---|---|---|---|---|
| R1 | CSP en mode report-only (pas strict) | medium | Headers durcis, pas d'inline `<script>` non contrôlé | CSP stricte (`docs/security/csp-followup.md`) |
| R2 | 9 secrets encore en env (non Vault) | low | Guardrails top-level + scanner CI + rotation runbook | Envisager rotation automatisée |
| R3 | Rate limiting ad-hoc uniquement | medium | Kill-switches + audit trail | Rate limiter global (edge) |
| R4 | Signature des artefacts RC | low | Archivage manuel | Sigstore / cosign sur artefacts |
| R5 | Chaos / fuzzing absents | low | E2E happy + webhook replay | Suite chaos Sprint 3 |
| R6 | SUPABASE_SERVICE_ROLE_KEY non rotable manuellement | accepté | Géré par Lovable Cloud | — |

Aucun risque **critical** ouvert.

## 6. Recommandations futures

**Sprint 3 (proposé — voir `docs/sprints/sprint-3-plan.md`)** :
1. CSP stricte + SRI sur les assets externes.
2. Rate limiting déclaratif au niveau edge (par IP + par user).
3. Chaos suite (kill provider, saturer queue, corrompre webhook).
4. Signature chaîne de confiance sur les release artifacts.
5. Rotation automatisée des secrets (job programmé + PR bot).

**Long terme** :
- SOC2 pré-audit (contrôles ISO 27001 mappés).
- Bug bounty privé sur `/api/public/*`.
- Séparation environnement stage / prod côté DB (aujourd'hui unique projet).

---

## 7. Sign-off

| Item | Statut |
|---|---|
| Blocs A → F | ✅ CERTIFIED |
| Tests RC2 | ✅ 4/4 |
| Fuites secrets | ✅ 0 |
| Régression RC1 | ✅ aucune |
| Documentation | ✅ complète (7 documents) |
| Alerting production | ✅ opérationnel (Telegram) |

**Sprint 2 — CERTIFIED, FROZEN, ready to tag `v1.0.0-security`.**