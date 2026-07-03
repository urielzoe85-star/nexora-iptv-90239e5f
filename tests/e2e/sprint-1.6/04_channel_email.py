#!/usr/bin/env python3
"""Après dispatch, delivery_logs channel=email inséré + channels_sent.email."""
from __future__ import annotations
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sprint-1.5"))
from helpers.db import psql  # noqa: E402
from _shared import (unique_suffix, create_order, create_inventory_account,
                     get_order_metadata, cleanup, emit_test_event, drain_queue)


def main() -> int:
    suffix = unique_suffix()
    order = create_order(suffix)
    account = create_inventory_account(suffix)
    try:
        emit_test_event("payment.confirmed", order["order_ref"], {
            "orderRef": order["order_ref"], "accountId": account["id"],
        })
        drain_queue(max_iter=6)
        row = psql("SELECT count(*)::text FROM public.delivery_logs "
                   f"WHERE order_id='{order['id']}' AND channel='email'")
        n = int(row.strip().splitlines()[-1].strip())
        assert n >= 1, f"attendu >=1 delivery_logs email, obtenu {n}"
        d = get_order_metadata(order["id"]).get("iptv_delivery") or {}
        ch = (d.get("channels_sent") or {}).get("email")
        assert ch is not None, "channels_sent.email absent"
        print(f"OK — {n} delivery_logs email · ok={ch.get('ok')}")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=account["id"])


if __name__ == "__main__":
    sys.exit(main())
