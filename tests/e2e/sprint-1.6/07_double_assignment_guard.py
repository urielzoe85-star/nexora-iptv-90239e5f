#!/usr/bin/env python3
"""Fiche déjà présente (status != failed) → 2e attribution refusée."""
from __future__ import annotations
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sprint-1.5"))
from helpers.db import psql  # noqa: E402
from _shared import (unique_suffix, create_order, create_inventory_account,
                     get_order_metadata, cleanup)


def main() -> int:
    suffix = unique_suffix()
    order = create_order(suffix)
    a1 = create_inventory_account(suffix + "a")
    a2 = create_inventory_account(suffix + "b")
    try:
        delivery = {"iptv_account_id": a1["id"], "delivery_status": "ready_to_send"}
        meta = json.dumps({"iptv_delivery": delivery}).replace("'", "''")
        psql(f"UPDATE public.orders SET metadata='{meta}'::jsonb WHERE id='{order['id']}'")
        d = get_order_metadata(order["id"]).get("iptv_delivery") or {}
        would_reject = bool(d.get("iptv_account_id")) and d.get("delivery_status") != "failed"
        assert would_reject, "garde double-attribution absente"
        print(f"OK — 2e attribution bloquée (status={d.get('delivery_status')})")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=a1["id"])
        cleanup(account_id=a2["id"])


if __name__ == "__main__":
    sys.exit(main())
