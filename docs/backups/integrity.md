# Intégrité et drills de restauration

_Sprint 3 · Bloc B — Backups & Restore_

## 1. Empreinte d'intégrité

La fonction `public.backup_capture_integrity(_run_id UUID)` calcule :

```
row_count = count(*) FROM public.<table>
checksum  = md5( concat( sorted md5(row_to_json(x)) for x in <table> ) )
```

Propriétés :

- Deux bases identiques (même contenu logique) produisent le **même
  checksum**, quel que soit l'ordre d'insertion.
- Toute modification (INSERT, UPDATE, DELETE, corruption physique) change
  le checksum.
- Le résultat est stocké dans `public.backup_integrity_snapshots`, ce qui
  autorise la comparaison inter-runs et la détection de dérive.

## 2. Drill de restauration

`public.backup_restore_drill(_table TEXT)` :

1. Vérifie que la table demandée est dans l'allow-list critique.
2. Crée un clone `UNLOGGED` de la table dans `public` avec un nom
   horodaté (`_restore_drill_<table>_<ts>`).
3. Calcule row_count + checksum sur source et clone.
4. Supprime le clone.
5. Retourne un JSON `{ source_rows, restored_rows, source_checksum,
   restored_checksum, match }`.

Le clone étant `UNLOGGED`, il n'entre pas dans les journaux WAL : le drill
n'a aucun impact sur la stratégie de sauvegarde en amont.

## 3. Fréquence et rotation

- `verify` : quotidien sur les 8 tables critiques.
- `restore_drill` : quotidien sur 1 table (round-robin par jour de
  l'année) → chaque table drillée au moins 1×/8 j, soit ≥ 45 drills/an
  par table.

## 4. Sécurité

- Fonctions déclarées `SECURITY DEFINER` avec `search_path = public`.
- `EXECUTE` révoqué de `PUBLIC`, `anon`, `authenticated` — accessibles
  uniquement via `service_role` (endpoint cron auth Bearer).
- Tables allow-listées en dur : aucune injection SQL possible via
  `_table`.
- Aucune donnée PII n'est écrite dans `backup_integrity_snapshots` (seuls
  row_count + checksum md5).