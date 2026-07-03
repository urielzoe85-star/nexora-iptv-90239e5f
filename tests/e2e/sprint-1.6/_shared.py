"""Utilitaires partagés — création commande + compte IPTV inventaire."""
from __future__ import annotations
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "sprint-1.5")))

from helpers.db import psql  # noqa: E402
from helpers.http import emit_test_event, drain_queue  # noqa: E402


def unique_suffix() -> str:
    return uuid.uuid4().hex[:10]


def create_order(suffix: str, *, email: str | None = None, status: str = "pending") -> dict:
    ref = f"NX-16{suffix.upper()}"
    em = email or f"e2e+{suffix}@nexora-iptv.local"
    psql(
        "INSERT INTO public.orders (order_ref, email, full_name, plan_name, amount, currency, status, metadata) "
        f"VALUES ('{ref}', '{em}', 'E2E Sprint 1.6', 'Premium 1 mois', 10.00, 'EUR', '{status}', '{{}}'::jsonb)"
    )
    row = psql(f"SELECT id::text FROM public.orders WHERE order_ref = '{ref}'")
    return {"order_ref": ref, "id": row.strip().splitlines()[-1].strip(), "email": em}


def create_inventory_account(suffix: str) -> dict:
    username = f"nx_e2e_{suffix}"
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    psql(
        "INSERT INTO public.iptv_accounts "
        "(username, password, account_type, status, package, dns_link, dns_link_samsung_lg, portal_link, "
        " max_connections, expires_at, metadata) VALUES "
        f"('{username}', 'pwd_{suffix}', 'premium', 'available', '3 Months', "
        f" 'http://dns.example.com:80', 'http://dns.example.com/samsung', 'http://portal.example.com', "
        f" 2, '{expires}', '{{\"source\":\"e2e\"}}'::jsonb)"
    )
    row = psql(f"SELECT id::text FROM public.iptv_accounts WHERE username = '{username}'")
    return {"id": row.strip().splitlines()[-1].strip(), "username": username}


def get_order_metadata(order_id: str) -> dict:
    row = psql(f"SELECT metadata::text FROM public.orders WHERE id = '{order_id}'")
    body = row.strip().splitlines()[-1].strip()
    return json.loads(body or "{}")


def cleanup(order_id: str | None = None, account_id: str | None = None):
    if order_id:
        psql(f"DELETE FROM public.delivery_logs WHERE order_id = '{order_id}'")
        psql(f"DELETE FROM public.orders WHERE id = '{order_id}'")
    if account_id:
        psql(f"DELETE FROM public.iptv_accounts WHERE id = '{account_id}'")


def assert_delivery_complete(delivery: dict):
    required = ["iptv_account_id", "username", "dns_link", "m3u_url",
                "package", "max_connections", "expires_at",
                "playlist_download_url", "delivery_status"]
    missing = [k for k in required if not delivery.get(k)]
    assert not missing, f"champs manquants dans la fiche : {missing}"