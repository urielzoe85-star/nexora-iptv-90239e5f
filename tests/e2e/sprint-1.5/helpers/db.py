"""
Client Supabase minimal (via REST PostgREST) — pas de dépendance à
supabase-py. Utilise le service role key pour contourner la RLS pendant
le seed et les assertions.
"""
from __future__ import annotations
import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error
from typing import Any


class SupaAdmin:
    def __init__(self) -> None:
        url = os.environ["SUPABASE_URL"].rstrip("/")
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self.rest = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _req(self, method: str, path: str, body: Any = None, params: dict | None = None) -> Any:
        url = f"{self.rest}/{path.lstrip('/')}"
        if params:
            url += "?" + urllib.parse.urlencode(params, safe=",=.():*")
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode() or "null"
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()[:400]}") from e

    # --- table shortcuts ---
    def insert(self, table: str, row: dict) -> dict:
        rows = self._req("POST", table, [row])
        return rows[0] if isinstance(rows, list) and rows else rows

    def select(self, table: str, params: dict) -> list:
        return self._req("GET", table, params={"select": "*", **params}) or []

    def update(self, table: str, params: dict, patch: dict) -> list:
        return self._req("PATCH", table, body=patch, params=params) or []

    def delete(self, table: str, params: dict) -> None:
        self._req("DELETE", table, params=params)

    # --- test-scope helpers ---
    def seed_customer_and_order(self, ref: str, *, with_sebpay_ref: bool = False) -> dict:
        cust = self.insert("customers", {
            "email": f"{ref.lower()}@e2e.test",
            "full_name": "E2E Runner",
            "status": "active",
            "metadata": {"e2e": True, "ref": ref},
        })
        order = self.insert("orders", {
            "order_ref": ref,
            "email": cust["email"],
            "full_name": cust["full_name"],
            "plan_id": "e2e-plan",
            "plan_name": "E2E Test Plan",
            "amount": 1.00,
            "currency": "EUR",
            "method": "card",
            "status": "pending",
            "sebpay_reference": f"sebpay_{ref}" if with_sebpay_ref else None,
            "metadata": {"e2e": True},
        })
        return {"customer": cust, "order": order}

    def disable_megaott(self) -> list[dict]:
        """Force the automation to run in simulated MEGAOTT mode.

        Matches the same resolver used by the connector
        (`metadata.kind = 'megaott'` OR `name ILIKE '%megaott%'`) and flips
        every matching row to `status = 'inactive'`. Returns a snapshot so
        `restore_megaott` can revert exactly what we changed — never widens
        the write beyond the row IDs we touched.
        """
        rows = self._req("GET", "iptv_providers", params={
            "select": "*",
            "or": "(metadata->>kind.eq.megaott,name.ilike.*megaott*)",
        }) or []
        for p in rows:
            self.update("iptv_providers", {"id": f"eq.{p['id']}"}, {"status": "inactive"})
        return rows

    def restore_megaott(self, snapshot: list[dict]) -> None:
        for p in snapshot:
            self.update("iptv_providers", {"id": f"eq.{p['id']}"}, {
                "status": p.get("status") or "inactive",
            })

    def cleanup_ref(self, ref: str) -> None:
        # Schema-aligned cleanup. Relies on ON DELETE CASCADE for:
        #   * delivery_logs.order_id     -> orders.id
        #   * automation_steps.run_id    -> automation_runs.id
        #   * customer_events.customer_id-> customers.id
        # so we only need to delete the parents explicitly. All queries are
        # keyed on values we control (order_ref / metadata.ref / payload)
        # and never reference columns that don't exist on the target table.
        for table, where in [
            ("iptv_accounts",    {"metadata->>order_ref": f"eq.{ref}"}),
            ("automation_queue", {"payload->>orderRef":   f"eq.{ref}"}),
            ("automation_runs",  {"payload->>orderRef":   f"eq.{ref}"}),
            ("orders",           {"order_ref":            f"eq.{ref}"}),
            ("customers",        {"metadata->>ref":       f"eq.{ref}"}),
        ]:
            try:
                self.delete(table, where)
            except Exception as e:
                print(f"[cleanup] skip {table}: {e}")

    def poll(self, fn, *, timeout: float = 20.0, interval: float = 0.5):
        """Retry fn() until truthy or timeout."""
        deadline = time.time() + timeout
        last = None
        while time.time() < deadline:
            last = fn()
            if last:
                return last
            time.sleep(interval)
        return last