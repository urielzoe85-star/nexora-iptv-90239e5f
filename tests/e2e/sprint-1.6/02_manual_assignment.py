#!/usr/bin/env python3
"""Attribution manuelle : fiche présente + statut prêt à envoyer."""
from __future__ import annotations
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sprint-1.5"))
from helpers.db import psql  # noqa: E402
from _shared import (unique_suffix, create_order, create_inventory_account,
                     get_order_metadata, cleanup, assert_delivery_complete)


def main() -> int:
    suffix = unique_suffix()
    order = create_order(suffix)
    account = create_inventory_account(suffix)
    try:
        psql(f"UPDATE public.iptv_accounts SET status='assigned', order_id='{order['id']}' "
             f"WHERE id='{account['id']}'")
        delivery = {
            "iptv_account_id": account["id"], "username": account["username"],
            "password": f"pwd_{suffix}", "package": "3 Months",
            "dns_link": "http://dns.example.com:80",
            "dns_link_samsung_lg": "http://dns.example.com/samsung",
            "m3u_url": f"http://dns.example.com:80/get.php?username={account['username']}&password=pwd_{suffix}&type=m3u_plus&output=ts",
            "max_connections": 2, "expires_at": "2026-12-31T00:00:00Z",
            "playlist_download_url": "https://nexora-iptv.com/api/public/iptv/playlist?t=demo&k=m3u",
            "delivery_status": "ready_to_send",
        }
        meta = json.dumps({"iptv_delivery": delivery}).replace("'", "''")
        psql(f"UPDATE public.orders SET metadata='{meta}'::jsonb WHERE id='{order['id']}'")
        d = get_order_metadata(order["id"]).get("iptv_delivery") or {}
        assert_delivery_complete(d)
        print(f"OK — attribution manuelle : {d['username']}")
        return 0
    finally:
        cleanup(order_id=order["id"], account_id=account["id"])


if __name__ == "__main__":
    sys.exit(main())
