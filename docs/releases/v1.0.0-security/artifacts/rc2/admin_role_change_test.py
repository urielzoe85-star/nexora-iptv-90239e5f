"""Sprint 2 — Bloc E : garanties `admin_change_role` + audit trail.

Valide au niveau base de données les protections exigées par le cahier
des charges Bloc E :

  1. Promotion (grant_admin) — insertion d'une nouvelle ligne user_roles.
  2. Révocation d'un admin non-dernier — suppression contrôlée.
  3. Blocage de la suppression du dernier admin (guard SQL).
  4. Blocage de l'auto-révocation (guard SQL).
  5. Refus d'exécution par les rôles anon / authenticated.
  6. Traçabilité complète dans `security_events` (colonnes request_id +
     target_user_id ajoutées par la migration Bloc D→E).

Les scénarios 1→4 sont testés en deux temps :

  - Ceux qui n'accèdent pas à `auth.users` (validation d'entrée, guards
    logiques déclenchés avant toute écriture) sont exécutés en direct.
  - Les scénarios nécessitant de vrais utilisateurs auth (promotion réelle,
    suppression réelle) sont validés par introspection : on vérifie que le
    corps de la fonction contient les gardes SQL et que la migration
    définit correctement les privilèges. Les tests E2E complets tournent
    dans le harnais Sprint 1.5 (`tests/e2e`) qui dispose du service_role
    API pour créer des utilisateurs auth.

Usage :
  DATABASE_URL=... python tests/rc2/admin_role_change_test.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import uuid

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
if not DB_URL:
    print("SKIP: DATABASE_URL / SUPABASE_DB_URL non défini.")
    sys.exit(0)


def psql(sql: str) -> tuple[int, str, str]:
    p = subprocess.run(
        ["psql", DB_URL, "-Atqc", sql],
        capture_output=True, text=True, timeout=30,
    )
    return p.returncode, p.stdout.strip(), p.stderr.strip()


failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    mark = "OK  " if ok else "FAIL"
    print(f"  [{mark}] {name}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def main() -> int:
    fake_actor = str(uuid.uuid4())
    fake_target = str(uuid.uuid4())

    # 1. Fonction déclarée SECURITY DEFINER avec search_path figé.
    c, out, _ = psql(
        "SELECT prosecdef, proconfig::text FROM pg_proc "
        "WHERE proname='admin_change_role' AND pronamespace='public'::regnamespace;"
    )
    check("admin_change_role est SECURITY DEFINER avec search_path=public",
          c == 0 and out.startswith("t|") and "search_path=public" in out.replace(" ", ""),
          out)

    # 2. Corps de la fonction contient les guards attendus.
    c, body, _ = psql(
        "SELECT pg_get_functiondef(p.oid) FROM pg_proc p "
        "WHERE proname='admin_change_role' AND pronamespace='public'::regnamespace;"
    )
    for needle in (
        "Cannot remove the last active administrator",
        "You cannot revoke your own admin role",
        "FOR UPDATE",
        "grant_admin",
        "revoke_admin",
    ):
        check(f"guard SQL présent: {needle!r}", needle in body)

    # 3. Validation d'entrée : action inconnue rejetée avant tout accès DB.
    c, _, err = psql(
        f"SELECT public.admin_change_role('{fake_actor}','{fake_target}','bogus');"
    )
    check("action inconnue rejetée (input validation)",
          c != 0 and "Invalid action" in err, err[:120])

    # 4. NULL actor/target rejetés.
    c, _, err = psql(
        "SELECT public.admin_change_role(NULL, NULL, 'grant_admin');"
    )
    check("actor/target NULL rejetés",
          c != 0 and "actor and target are required" in err, err[:120])

    # 5. Privilèges EXECUTE conformes à la migration Bloc E.
    for role, expected in (("anon", "f"), ("authenticated", "f"), ("service_role", "t")):
        c, out, err = psql(
            "SELECT has_function_privilege("
            f"'{role}','public.admin_change_role(uuid,uuid,text)','EXECUTE');"
        )
        check(f"EXECUTE {role} = {expected}", c == 0 and out == expected, err or out)

    # 6. Table security_events prête pour la corrélation Bloc D→E.
    c, cols, _ = psql(
        "SELECT string_agg(column_name, ',') FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='security_events';"
    )
    for col in ("request_id", "target_user_id", "actor_user_id"):
        check(f"security_events.{col} existe", col in cols, cols)

    # 7. Événements d'audit émis par les fonctions serveur sont bien
    #    référencés — vérifie que les types d'événements attendus sont
    #    connus du code (contrat schéma). Recherche best-effort dans le
    #    dépôt.
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    admin_fn = os.path.join(repo_root, "src", "lib", "admin.functions.ts")
    try:
        src = open(admin_fn, encoding="utf-8").read()
    except OSError:
        src = ""
    for evt in (
        "admin.role.granted",
        "admin.role.revoked",
        "admin.role.revoke_blocked",
        "admin.role.grant_failed",
    ):
        check(f"événement audit défini: {evt}", evt in src)

    if failures:
        print(f"\nRESULT: {len(failures)} check(s) failed")
        return 1
    print("\nRESULT: all Bloc E guarantees hold ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
