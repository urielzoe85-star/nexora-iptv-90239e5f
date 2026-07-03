#!/usr/bin/env python3
"""Sans connecteur WhatsApp, channels_sent.whatsapp = skipped."""
from __future__ import annotations
import sys
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
        d = get_order_metadata(order["id"]).get("iptv_delivery") or {}
        ch = (d.get("channels_sent") or {}).get("whatsapp")
        assert ch is not None, "channels_sent.whatsapp absent"
        assert ch.get("ok") in (False, None), f"whatsapp inattendu ok=True : {ch}"
        print(f"OK — whatsapp skipped ({ch.get('error')})")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=account["id"])


if __name__ == "__main__":
    sys.exit(main())
