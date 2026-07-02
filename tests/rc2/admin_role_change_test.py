"""Sprint 2 — Bloc E : tests des garanties `admin_change_role`.

Valide directement la fonction Postgres (SECURITY DEFINER) via psql :
  - promotion (grant_admin)
  - révocation d'un admin non-dernier
  - blocage de la suppression du dernier admin
  - blocage de l'auto-révocation
  - refus d'exécution par un rôle non autorisé (anon/authenticated)

Usage :
  DATABASE_URL=postgres://... python tests/rc2/admin_role_change_test.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
if not DB_URL:
    print("SKIP: DATABASE_URL / SUPABASE_DB_URL non défini.")
    sys.exit(0)


def psql(sql: str, *, role: str = "service_role") -> tuple[int, str, str]:
    """Exécute `sql` avec le rôle demandé, retourne (code, stdout, stderr)."""
    wrapped = f"SET ROLE {role}; {sql}"
    p = subprocess.run(
        ["psql", DB_URL, "-Atqc", wrapped],
        capture_output=True, text=True, timeout=30,
    )
    return p.returncode, p.stdout.strip(), p.stderr.strip()


def run() -> int:
    actor = str(uuid.uuid4())
    target = str(uuid.uuid4())
    extra = str(uuid.uuid4())
    failures: list[str] = []

    # Setup : deux admins pré-existants (actor + target) pour couvrir tous
    # les scénarios sans dépendre d'un état extérieur.
    setup = f"""
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('{actor}', 'admin'),
        ('{target}', 'admin')
      ON CONFLICT DO NOTHING;
    """
    code, _, err = psql(setup)
    if code != 0:
        print("SETUP FAILED:", err); return 1

    def check(name: str, ok: bool, detail: str = "") -> None:
        mark = "OK  " if ok else "FAIL"
        print(f"  [{mark}] {name}{(' — ' + detail) if detail else ''}")
        if not ok:
            failures.append(name)

    try:
        # 1. Promotion d'un nouvel utilisateur.
        c, out, err = psql(
            f"SELECT public.admin_change_role('{actor}','{extra}','grant_admin');"
        )
        payload = json.loads(out) if c == 0 and out else {}
        check("promotion nouvel utilisateur",
              c == 0 and payload.get("new_role") == "admin"
              and payload.get("old_role") == "none",
              err or out)

        # 2. Révocation d'un admin non-dernier (target).
        c, out, err = psql(
            f"SELECT public.admin_change_role('{actor}','{target}','revoke_admin');"
        )
        payload = json.loads(out) if c == 0 and out else {}
        check("révocation d'un admin (non-dernier)",
              c == 0 and payload.get("new_role") == "none"
              and (payload.get("admin_count") or 0) >= 2,
              err or out)

        # 3. Tentative d'auto-révocation → doit échouer.
        c, out, err = psql(
            f"SELECT public.admin_change_role('{actor}','{actor}','revoke_admin');"
        )
        check("auto-révocation bloquée",
              c != 0 and "cannot revoke your own" in err.lower(),
              err[:120])

        # 4. On réduit à un seul admin puis on tente de le supprimer.
        psql(f"DELETE FROM public.user_roles WHERE user_id='{extra}';")
        c, out, err = psql(
            f"SELECT public.admin_change_role('{target}','{actor}','revoke_admin');"
        )
        check("suppression du dernier admin bloquée",
              c != 0 and "last active administrator" in err.lower(),
              err[:120])

        # 5. Rôles non autorisés ne peuvent pas exécuter la fonction.
        for role in ("anon", "authenticated"):
            c, out, err = psql(
                f"SELECT public.admin_change_role('{actor}','{target}','grant_admin');",
                role=role,
            )
            check(f"exécution refusée pour {role}",
                  c != 0 and "permission denied" in err.lower(),
                  err[:120])

    finally:
        psql(
            f"DELETE FROM public.user_roles "
            f"WHERE user_id IN ('{actor}','{target}','{extra}');"
        )

    if failures:
        print(f"\nRESULT: {len(failures)} check(s) failed")
        return 1
    print("\nRESULT: all Bloc E guarantees hold ✅")
    return 0


if __name__ == "__main__":
    sys.exit(run())
