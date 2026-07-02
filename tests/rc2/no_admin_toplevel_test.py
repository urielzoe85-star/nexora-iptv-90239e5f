"""Sprint 2 / Bloc C — garde-fou : `client.server` ne doit jamais être importé
au top-level d'un fichier `*.functions.ts` (leak client bundle).

Usage : `python tests/rc2/no_admin_toplevel_test.py` — code 0 si aucun hit.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGETS = list((ROOT / "src" / "lib").glob("*.functions.ts"))
PATTERN = re.compile(r"^\s*import\s+.*from\s+['\"]@/integrations/supabase/client\.server['\"]", re.M)


def main() -> int:
    hits: list[str] = []
    for f in TARGETS:
        src = f.read_text()
        for m in PATTERN.finditer(src):
            line = src[: m.start()].count("\n") + 1
            hits.append(f"{f.relative_to(ROOT)}:{line}: top-level import of client.server")
    if hits:
        print("Bloc C C3 — FAIL:")
        for h in hits:
            print(f" - {h}")
        return 1
    print(f"Bloc C C3 — OK ({len(TARGETS)} files scanned, 0 top-level import).")
    return 0


if __name__ == "__main__":
    sys.exit(main())