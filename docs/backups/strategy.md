# NEXORA — Stratégie de sauvegarde et de continuité

_Sprint 3 · Bloc B — Backups & Restore_
_Owner : équipe plateforme_

## 1. Objectifs

| Métrique | Cible |
|---|---|
| **RPO** (perte de données maximale acceptable) | ≤ 24 h |
| **RTO** (temps de restauration maximal) | ≤ 4 h |
| **Test de restauration** | ≥ 1 par mois, prouvé par un drill automatisé |
| **Alerte échec** | ≤ 5 min via Telegram (`security_events` → `backup.failure`) |

## 2. Sources de sauvegarde

La base de données NEXORA est hébergée sur **Lovable Cloud** (Postgres
managé). Deux niveaux de protection coexistent :

### 2.1 Sauvegardes physiques — plateforme (managed)

La plateforme réalise en continu :

- **PITR** (Point-In-Time Recovery) sur 7 jours minimum.
- **Snapshots quotidiens** conservés selon la politique de rétention
  du plan Lovable Cloud actif.

Ces sauvegardes sont exécutées et supervisées côté infrastructure ; NEXORA
ne peut ni les modifier, ni les supprimer.

### 2.2 Contrôles applicatifs — NEXORA

Complémentaires aux sauvegardes physiques, ils **prouvent** que les
données sont exploitables :

| Contrôle | Fréquence | Endpoint |
|---|---|---|
| Empreinte d'intégrité (row count + checksum md5) sur 8 tables critiques | **Quotidien** | `POST /api/public/hooks/backup-verify` (mode `verify`) |
| Drill de restauration (clone + comparaison + drop) sur 1 table | **Quotidien** (round-robin sur 8 tables → chaque table drillée ≥ 1×/8 j) | `POST /api/public/hooks/backup-verify` `{"mode":"restore_drill"}` |
| Nettoyage de rétention des métadonnées | **Mensuel** | `POST /api/public/hooks/backup-verify` `{"mode":"retention"}` |

## 3. Rétention

### 3.1 Sauvegardes physiques (plateforme)

| Type | Rétention |
|---|---|
| PITR | 7 jours glissants |
| Snapshots quotidiens | 7 jours |
| Snapshots hebdomadaires | 4 semaines |
| Snapshots mensuels | 12 mois |

### 3.2 Métadonnées applicatives (`backup_runs`)

| Type | Rétention |
|---|---|
| Runs de vérification / drill | 365 jours (nettoyage cron mensuel) |
| Snapshots d'intégrité | 365 jours (cascade sur `backup_runs`) |

## 4. Tables critiques auditées

`customers`, `orders`, `iptv_accounts`, `subscriptions`, `user_roles`,
`plans`, `products`, `automation_workflows`.

La liste est verrouillée dans `public.backup_capture_integrity` et
`public.backup_restore_drill` (allow-list en dur — aucune injection possible).

## 5. Détection de dérive

À chaque exécution `verify`, chaque table est comparée à son dernier
snapshot. Une baisse > 10 % du nombre de lignes déclenche un événement
`backup.drift_detected` de sévérité `warn` (Telegram + audit).

## 6. Surveillance et alertes

| Événement | Sévérité | Canal |
|---|---|---|
| `backup.failure` (échec verify / drill / retention) | `critical` | `security_events` + Telegram immédiat |
| `backup.drift_detected` (chute > 10 %) | `warn` | `security_events` + Telegram |
| Run `status = warn` | consultable | admin dashboard (`backup_runs`) |

Chaque `backup_runs.summary` est exploitable en JSON depuis l'admin.

## 7. Références

- Procédure de restauration : [`runbook-restore.md`](./runbook-restore.md)
- Intégrité et drills : [`integrity.md`](./integrity.md)