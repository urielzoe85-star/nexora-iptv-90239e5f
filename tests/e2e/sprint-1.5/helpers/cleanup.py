"""Purge tous les artefacts E2E orphelins (préfixe NXR-E2E-)."""
from __future__ import annotations
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from helpers.db import SupaAdmin  # noqa: E402


def main() -> int:
    sb = SupaAdmin()
    orders = sb.select("orders", {"order_ref": "like.NXR-E2E-*"})
    for o in orders:
        print(f"[cleanup] purging {o['order_ref']}")
        sb.cleanup_ref(o["order_ref"])
    print(f"[cleanup] done — {len(orders)} order(s) purged")
    return 0


if __name__ == "__main__":
    sys.exit(main())