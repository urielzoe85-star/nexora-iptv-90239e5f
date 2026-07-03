# NEXORA ERP — Release Notes v1.0.0-GA

_Date de publication : 2026-07-03_
_Première version stable (General Availability)_

---

## 🎉 Bienvenue dans NEXORA ERP v1.0.0-GA

Cette version marque la première release stable de NEXORA ERP, la plateforme
de gestion IPTV end-to-end : catalogue, checkout, paiement, provisioning
automatique, livraison client, suivi de commande et back-office admin.

---

## ✨ Fonctionnalités principales

### Front public
- Catalogue multilingue (FR / EN / DE) avec pages SEO dédiées.
- Checkout complet avec acceptation CGV et audit `terms_version`.
- Suivi de commande via `/track` et pages `/payment.success` / `/payment.failed`.
- Guides IPTV, blog SEO, pages légales (`/legal/*`).

### Espace client
- Tableau de bord (`/dashboard`) : abonnements actifs, renouvellements,
  historique commandes.
- Désinscription email en un clic (`/unsubscribe`).

### Back-office administrateur (NCC)
- Gestion complète des commandes, plans, contenu, admins.
- Console IPTV : inventaire, abonnements, essais, renouvellements,
  suspensions, premium, import CSV, providers, debug.
- CRM clients, employés, bots, automatisation, analytics, logs, emails,
  notifications, paiements, support, Telegram, WhatsApp.
- Rôles séparés (table `user_roles` + `has_role`) — pas de privilege escalation.

### Billing lifecycle
- Rappels de renouvellement automatiques J-7 / J-3 / J-1.
- Dunning paiements échoués J+1 / J+3 / J+7 + suspension automatique.
- Réactivation instantanée sur paiement confirmé.

### Intégrations
- **Paiement** : SebPay (webhook signé).
- **IPTV** : MEGAOTT (provisioning, renouvellement, suspension).
- **Messagerie** : Telegram, WhatsApp, email transactionnel i18n.
- **Automation** : moteur workflow interne (order-created, payment-*,
  subscription-*).

### Sécurité
- RLS activé sur toutes les tables `public`.
- CSP report-only + endpoint `/api/public/csp-report`.
- Helpers SRI, signature ed25519 optionnelle des artefacts.
- Rate limiting sliding window par handler.
- Rotation secrets outillée (endpoint + runbook).
- Séparation stricte serveur/client : aucun module privilégié ni nom de
  secret dans le bundle navigateur.

### Continuité & observabilité
- Backups vérifiés quotidiennement + restore drill mensuel.
- RPO ≤ 24 h · RTO ≤ 4 h.
- Snapshot SLO Grafana-ready via `/api/public/hooks/slo-snapshot`.
- Alerting Telegram (`security_events`).

---

## 📊 SLO cibles (mesurés en continu)

| Métrique | Cible |
|---|---|
| p95 checkout | < 800 ms |
| Taux d'erreur global | < 0,5 % |
| Drain queue automation | < 30 s |
| Régressions visuelles pages publiques | 0 |
| RPO / RTO | ≤ 24 h / ≤ 4 h |

---

## ⚠️ Limitations connues

1. **Rate limiting edge** : pas d'infra edge dédiée en v1.0.0. Fallback
   ad-hoc par handler via `src/lib/rate-limit.server.ts`. Prévu Sprint 4.
2. **Bot de rotation de secrets automatique** : remplacé par
   `security_events` + on-call manuel (runbook `docs/security/secret-rotation.md`).
3. **Scénarios chaos live** : exécutés en dry-run sur PR ; runs live
   cadrés nightly staging, hors gate GA.
4. **Import repo GitHub existant** : non supporté (limitation plateforme).

---

## 🔐 Bonnes pratiques administrateurs

- Ne jamais partager le rôle `service_role` ; la rotation doit passer par
  le runbook officiel.
- Vérifier chaque semaine le rapport SLO et les alertes `security_events`.
- Toute nouvelle table publique doit inclure RLS + GRANT + policies dans
  la même migration.
- Les webhooks externes doivent obligatoirement passer par `/api/public/*`
  avec vérification de signature.

---

## 📚 Documentation associée

- Certification : `docs/releases/v1.0.0-ga/CERTIFICATION.md`
- Changelog : `docs/releases/v1.0.0-ga/CHANGELOG.md`
- Backups : `docs/backups/{strategy,runbook-restore,integrity}.md`
- Billing : `docs/billing/lifecycle.md`
- Sécurité : `docs/security/*`

---

## 🚀 Prochaine étape — v1.1.0

Le développement se poursuit sur la branche `v1.1.0-dev` (features
post-GA & croissance). La v1.0.0-GA reste figée ; seuls des hotfixes
référencés dans le CHANGELOG seront appliqués.

Merci à toutes celles et ceux qui ont porté NEXORA ERP jusqu'à cette
première version stable. 🙌