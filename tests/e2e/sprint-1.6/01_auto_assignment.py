#!/usr/bin/env python3
"""Auto-attribution : payment.confirmed → workflow → fiche prête + dispatch."""
from __future__ import annotations
import sys
from _shared import (unique_suffix, create_order, create_inventory_account,
                     get_order_metadata, cleanup, assert_delivery_complete,
                     emit_test_event, drain_queue)


def main() -> int:
    suffix = unique_suffix()
    order = create_order(suffix)
    account = create_inventory_account(suffix)
    try:
        code, body = emit_test_event("payment.confirmed", order["order_ref"], {
            "orderRef": order["order_ref"], "accountId": account["id"],
        })
        assert code == 200, f"emit HTTP {code}: {body[:400]}"
        drain_queue(max_iter=6)
        d = get_order_metadata(order["id"]).get("iptv_delivery") or {}
        assert_delivery_complete(d)
        print(f"OK — fiche générée pour {order['order_ref']} : status={d['delivery_status']}")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=account["id"])


if __name__ == "__main__":
    sys.exit(main())
