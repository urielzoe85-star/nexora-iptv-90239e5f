
# NEXORA™ ERP — Plan de stabilisation Release Candidate v1.0

Aucune nouvelle fonctionnalité. Aucun ajout de module. Objectif : rendre 100 % opérationnel ce qui existe déjà, dans l'ordre de criticité business.

## Principe de livraison

Je travaille par **sprints courts validés un par un**. Chaque sprint =
1. Audit ciblé du module (lecture code + DB + logs).
2. Liste des bugs/dead code/risques trouvés.
3. Corrections + tests.
4. Tu valides → on passe au sprint suivant.

Pas de gros refactor "big bang". Pas de réécriture. On corrige, on durcit, on supprime le mort.

---

## Sprint 1 — Chemin critique business (bloque la prod)

Le flux qui doit absolument marcher de bout en bout :
**Commande → SebPay → Webhook → Workflow `payment-confirmed` → MEGAOTT → Affectation compte IPTV → Livraison email/page → Historique client.**

### 1.1 — Paiement SebPay
- Vérifier `src/lib/payments.functions.ts` (`initSebPayCheckout`, `verifyPaymentInternal`).
- Webhook `src/routes/api/public/sebpay/webhook.ts` : signature HMAC, idempotence (rejouer 2× le même webhook ne doit pas créer 2 abonnements), validation Zod du payload, code de réponse correct.
- Pages `payment.success.tsx` / `payment.failed.tsx` : gestion des cas limites (ref invalide, paiement en attente, double-clic).
- Logs `delivery_logs` / `integration_debug_logs` en cas d'échec.

### 1.2 — Workflow automation `payment-confirmed`
- [x] Migration : colonne `idempotency_key` + index unique partiel sur `automation_queue`.
- [x] RPC `automation_claim_jobs` (FOR UPDATE SKIP LOCKED) — deux drains concurrents ne peuvent plus claim la même tâche.
- [x] `enqueueWorkflow` accepte une clé d'idempotence ; `emitBusinessEvent` la passe sous la forme `${event}:${orderRef}`.
- [x] Workflow `payment-confirmed` : guard "déjà completed" + `createIptvSubscription` skip si compte existe pour cet `order_ref`.
- [x] `createIptvSubscription` throw au lieu de masquer les échecs MEGAOTT en "simulated:true" → le run est failed et retenté.
- [x] `fetchOrder` / `markOrderStatus` acceptent `order_ref` ET `id` (bug : le payload émet `order_ref`, le workflow query par `id`).
- [x] Drain `process-queue` : backoff exponentiel (30s → 15min cap), reset `locked_at`, claim atomique via RPC.

### 1.3 — Intégration MEGAOTT
- [x] Gateway : surface du body upstream dans `IntegrationError.meta.upstreamBody` + `upstreamJson`, et hint (`json.message/error/detail`) dans le message — fini les "Upstream returned 422" opaques.
- [x] `mapStatus` : ne flip plus les comptes en `expired` quand la réponse n'a pas de champ status (bug : sync écrasait à expired des comptes actifs).
- [x] `createIptvSubscription` : message d'erreur inclut kind + status + détail upstream → visible dans `automation_steps.error` et dans les runs failed du panneau Automation.
- [x] Fix collateral : `Link to="/checkout"` ajoutait pas le search param requis → 3 routes patchées.

### 1.4 — Affectation & livraison
- [x] `MegaottDeliveryForm` branché dans `IptvDeliveryCard` (bouton « Saisie manuelle MEGAOTT » à côté de « Affecter depuis stock ») — l'admin peut livrer même quand l'auto a échoué.
- [x] `sendEmailAuto` : `idempotency_key` déterministe (`iptv-delivery-${order_id}`) — fini les doubles envois sur double-clic / retry.
- [x] Template `iptv-delivery.tsx` : quand `message_override` est fourni, on rend le corps tel quel (plus de double salutation ni de bloc monospace au milieu d'un HTML).
- [x] `markIptvDeliverySent` : suppression du stub d'insert dans `notifications` (la trace réelle est dans `delivery_logs`).
- [x] `getOrderByRef` expose `delivery.{status,sent_channel,sent_at}` (champs non sensibles uniquement) ; `track.tsx` base les étapes « compte créé » et « identifiants envoyés » sur le vrai statut de livraison au lieu d'un timer de 60 s.

### 1.5 — Tests E2E (Playwright, MEGAOTT réel)
- Scénario complet en headless, screenshots à chaque étape.
- SebPay mocké (pas de sandbox dispo).
- Vérifier `iptv_logs`, `delivery_logs`, `customer_events` peuplés correctement.

**Livrable Sprint 1** : rapport de bugs trouvés/corrigés + screenshots E2E + diff résumé.

---

## Sprint 2 — Sécurité & robustesse du critique

Avant d'élargir, on durcit ce qu'on vient de stabiliser.

- Audit RLS sur `orders`, `iptv_accounts`, `customers`, `subscriptions`, `delivery_logs`, `user_roles` via `supabase--linter`.
- Vérifier que toutes les Server Functions privilégiées (`supabaseAdmin`) vérifient bien `has_role(auth.uid(), 'admin')` avant d'agir.
- Vérifier qu'aucune route publique `/api/public/*` ne fait d'écriture sans vérification de signature/secret.
- Vérifier qu'aucun mot de passe IPTV / token MEGAOTT ne fuite dans les logs client, les responses serveur non-admin, ou les emails.
- Scan secrets via `security--run_security_scan`.

**Livrable Sprint 2** : rapport sécurité + corrections appliquées.

---

## Sprint 3 — Back-office NCC (Phase A + UX)

Module par module, dans cet ordre :

1. **Auth admin** (`admin.login.tsx`, `ncc.tsx` gate, `getMyAdminStatus`) — vérifier flux, déconnexion, redirections.
2. **Dashboard NCC** (`ncc.index.tsx` + `DashboardKpis`, `DashboardRevenueChart`, `DashboardActivityFeed`) — supprimer les mocks (`src/lib/ncc/mock-dashboard.ts`) si données réelles dispo, sinon clarifier le badge "mock".
3. **CRM Clients** (`ncc.clients.tsx`, `ncc.clients.$id.tsx`) — CRUD complet, recherche, pagination.
4. **Commandes** (`ncc.orders.tsx`, `ncc.orders.$id.tsx`) — vue détail, actions admin (refund, relance, livraison manuelle).
5. **Produits / Plans** (`ncc.products.tsx`, `admin.plans.tsx`).
6. **Stock IPTV** (`ncc.iptv.*` — 14 routes !) — vérifier doublons, regrouper si pertinent, supprimer les pages vides ou en double.
7. **Import MEGAOTT** (`ncc.iptv.import.tsx` + `iptv-import.functions.ts`) — robustesse parser CSV, mapping.
8. **Notifications** (`ncc.notifications.tsx` + `NccNotificationsPanel`).
9. **Paramètres** (`ncc.settings.*`).

À chaque module : harmoniser loaders/toasts/boutons (utiliser composants shadcn déjà installés), supprimer code mort.

**Livrable Sprint 3** : checklist module-par-module + capture avant/après quand UX changée.

---

## Sprint 4 — Public, SEO, i18n

- Pages publiques (`index.tsx`, `catalog.tsx`, `fr/en/de.tsx`, `legal-guide.tsx`, `guide-iptv`).
- Vérifier traductions FR/EN/DE complètes (`src/i18n/messages.ts`) — pas de clé manquante.
- Sitemap : vérifier que toutes les pages publiques indexables sont dedans, dynamiques (plans) inclus.
- Relancer scan SEO Lovable, traiter les findings restants.
- Vérifier `robots.txt`, métas par route, hreflang.

**Livrable Sprint 4** : scan SEO clean + audit i18n.

---

## Sprint 5 — Nettoyage final (Phase B)

Une seule passe transverse à la fin, parce qu'avant ça on a déjà nettoyé module par module.

- `bunx knip` ou équivalent pour détecter exports/dépendances non utilisés.
- Supprimer composants `src/components/ncc/modules/*` non référencés.
- Dédupliquer formulaires MEGAOTT (3 variants en doublon possible).
- Vérifier toutes les dépendances `package.json` réellement utilisées.

**Livrable Sprint 5** : liste fichiers supprimés + diff package.json.

---

## Sprint 6 — Documentation & release notes

- Mettre à jour `.lovable/plan.md`.
- Produire `docs/RC-v1.0.md` : modules opérationnels, limitations connues, runbook prod (que faire si MEGAOTT down, si webhook SebPay rejoué, etc.).
- Checklist pré-publication.

---

## Ce que je NE FERAI PAS dans cette RC (hors scope, à confirmer)

- Réécrire l'engine d'automatisation en queue persistante complète (déjà signalé dans l'audit).
- Brancher les connecteurs stub (Stripe, PayPal, autres IPTV, Resend) — restent désactivés explicitement.
- Ajouter monitoring externe (Sentry).
- Ajouter suite de tests unitaires (>10% coverage) — uniquement E2E sur chemin critique.

Si tu veux que l'un de ces points entre dans la RC, dis-le et je l'ajoute.

---

## Démarrage

Si tu valides ce plan, **je commence par le Sprint 1.1 (SebPay)** : audit + corrections, et je te livre un premier rapport avant de toucher au reste.
