#!/usr/bin/env python3
"""Tous les champs de la fiche sont peuplés."""
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
        expected = ["iptv_account_id", "username", "password", "package",
                    "dns_link", "dns_link_samsung_lg", "portal_link",
                    "m3u_url", "m3u_with_options_url", "enigma_url",
                    "playlist_download_url", "enigma_download_url",
                    "max_connections", "expires_at", "delivery_status",
                    "channels_sent"]
        missing = [f for f in expected if f not in d]
        assert not missing, f"champs absents : {missing}"
        print(f"OK — {len(expected)} champs présents dans la fiche")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=account["id"])


if __name__ == "__main__":
    sys.exit(main())
