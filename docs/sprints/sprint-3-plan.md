# Sprint 3 — Plan

_Status: **DRAFT** — awaiting kickoff approval_
_Predecessor: Sprint 2 (v1.0.0-security) CERTIFIED_
_Target release: **v1.0.0-ga** (General Availability)_

## 1. Objectifs

Transformer la RC durcie en release GA prête pour la production commerciale :

1. **Robustesse runtime** : rate limiting, quotas, chaos testing.
2. **Défense en profondeur** : CSP stricte, SRI, signature artefacts.
3. **Observabilité** : métriques SLO, traces distribuées, dashboards.
4. **Continuité** : backups vérifiés, DR runbook, restore drill.
5. **Facturation & billing** : cycle complet abonnement (renouvellement,
   dunning, remboursement, notes de crédit).
6. **Onboarding public** : parcours self-serve grand public + CGU / CGV.

## 2. Backlog priorisé

### P0 — Bloquants GA (must-have)

| ID | Titre | Estimation |
|---|---|---|
| S3-P0-01 | Rate limiting edge (par IP + par user, buckets configurables) | 3 j |
| S3-P0-02 | Backups DB automatisés + restore drill mensuel | 2 j |
| S3-P0-03 | Renouvellement abonnements (cron + email J-7 / J-3 / J-1) | 4 j |
| S3-P0-04 | Dunning email pour paiements échoués (3 relances + suspension) | 3 j |
| S3-P0-05 | Métriques SLO (latence p95, taux d'erreur, saturation queue) | 3 j |
| S3-P0-06 | CGU / CGV / mentions légales publiées + acceptation checkout | 2 j |

### P1 — Sécurité renforcée

| ID | Titre | Estimation |
|---|---|---|
| S3-P1-01 | CSP stricte (`script-src 'self' 'nonce-…'`) + rapport violation | 3 j |
| S3-P1-02 | SRI sur toutes les ressources externes (fonts, analytics) | 1 j |
| S3-P1-03 | Rotation automatisée des secrets (job + PR bot) | 4 j |
| S3-P1-04 | Signature artefacts release (cosign / sigstore) | 2 j |
| S3-P1-05 | Chaos suite (kill provider, saturer queue, corrompre webhook) | 5 j |

### P2 — Qualité & DX

| ID | Titre | Estimation |
|---|---|---|
| S3-P2-01 | Dashboard interne SLO + alertes (Grafana ou équivalent) | 4 j |
| S3-P2-02 | Fuzzing Zod schemas sur endpoints publics | 3 j |
| S3-P2-03 | Load test 100 rps sur checkout + webhook | 2 j |
| S3-P2-04 | Playwright visual regression sur pages publiques | 3 j |

## 3. Critères d'acceptation (Definition of Done GA)

- Tous les items P0 livrés + couvert par test automatisé.
- SLO définis et respectés sur 7 jours consécutifs :
  - p95 checkout < 800 ms
  - taux d'erreur < 0.5 %
  - queue automation drain < 30 s
- Restore drill exécuté et documenté (RPO ≤ 24 h, RTO ≤ 4 h).
- CSP stricte activée sans violation en production sur 48 h.
- Aucune régression sur suite RC1 + RC2.
- Runbook DR + on-call rotation documentés.
- Certification finale `v1.0.0-ga` signée.

## 4. Dépendances

- **Externe** :
  - SebPay : confirmation quotas + endpoint sandbox stable.
  - MEGAOTT : SLA écrit (temps de réponse provisioning).
  - Fournisseur backup (Lovable Cloud managed backups).
- **Interne** :
  - Sprint 2 CERTIFIED (`v1.0.0-security`) — ✅ acquis.
  - Design CGV / CGU validé produit + juridique.
  - Budget infra (rate limiter edge, observabilité).

## 5. Estimation globale

| Bucket | Charge |
|---|---|
| P0 (must-have) | 17 j |
| P1 (security++) | 15 j |
| P2 (quality) | 12 j |
| Buffer risque (20 %) | 9 j |
| **Total** | **~53 j-homme** |

Cible : **6 semaines** avec 2 équivalents temps plein, ou 8 semaines à 1.5 ETP.

## 6. Livrables Sprint 3

1. Release `v1.0.0-ga` taguée, certifiée, publiée.
2. Dossier `docs/releases/v1.0.0-ga/` complet (CHANGELOG, certification,
   artefacts, runbooks DR).
3. Dashboards SLO opérationnels.
4. CGU / CGV publiées et acceptées côté checkout.
5. Chaos + load reports archivés.
6. Sprint 4 backlog priorisé (post-GA : features & croissance).

---

## 7. Ouverture

Sprint 3 ouvre dès validation par le PO. Kickoff proposé : **planning +
découpage tickets** sur les 2 premiers jours, puis exécution P0 en parallèle
P1 selon disponibilité équipe.