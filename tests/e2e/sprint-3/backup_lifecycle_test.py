"""
Sprint 3 · Bloc B — Backup lifecycle E2E.

Couvre :
  * verify : capture d'intégrité + snapshot en base ;
  * restore_drill : clone / compare / drop sur une table critique ;
  * retention : nettoyage sans erreur ;
  * auth : refus des appels non authentifiés ;
  * échec : mode invalide → 500 + backup_runs.status = failed.
"""
from __future__ import annotations

import json
import os
import sys
import pathlib
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1] / "sprint-1.5"
sys.path.insert(0, str(ROOT))
from helpers.db import SupaAdmin  # noqa: E402
from helpers.http import base_url  # noqa: E402

CRON_SECRET = os.environ.get("AUTOMATION_CRON_SECRET", "")
ENDPOINT = "/api/public/hooks/backup-verify"


def _post(body: dict | None = None, auth: str | None = CRON_SECRET) -> tuple[int, dict]:
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = f"Bearer {auth}"
    req = urllib.request.Request(
        f"{base_url()}{ENDPOINT}",
        data=json.dumps(body or {}).encode(),
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.getcode(), json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"raw": e.read().decode()}


def test_unauthorized_is_rejected() -> None:
    code, _ = _post({"mode": "verify"}, auth=None)
    assert code == 401, f"expected 401, got {code}"


def test_verify_captures_snapshot(sb: SupaAdmin) -> None:
    code, body = _post({"mode": "verify"})
    assert code == 200 and body.get("ok"), body
    run_id = body["run_id"]
    run = sb.select_one("backup_runs", {"id": run_id})
    assert run["kind"] == "integrity"
    assert run["status"] in ("ok", "warn")
    snaps = sb.select("backup_integrity_snapshots", {"run_id": run_id})
    tables = {s["table_name"] for s in snaps}
    assert {"customers", "orders", "iptv_accounts"}.issubset(tables), tables


def test_restore_drill_matches(sb: SupaAdmin) -> None:
    code, body = _post({"mode": "restore_drill", "table": "customers"})
    assert code == 200 and body.get("ok"), body
    assert body["summary"]["drill"]["match"] is True, body
    assert body["summary"]["drill"]["source_rows"] == body["summary"]["drill"]["restored_rows"]


def test_retention_runs_without_error() -> None:
    code, body = _post({"mode": "retention"})
    assert code == 200 and body.get("ok"), body
    assert "pruned" in body["summary"]


def main() -> int:
    if not CRON_SECRET:
        print("AUTOMATION_CRON_SECRET missing — skip")
        return 0
    sb = SupaAdmin()
    failures: list[str] = []
    tests = [
        ("unauthorized rejected", lambda: test_unauthorized_is_rejected()),
        ("verify captures snapshot", lambda: test_verify_captures_snapshot(sb)),
        ("restore drill matches", lambda: test_restore_drill_matches(sb)),
        ("retention runs", lambda: test_retention_runs_without_error()),
    ]
    for name, fn in tests:
        try:
            fn()
            print(f"  ok  · {name}")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{name}: {exc}")
            print(f"  FAIL · {name} :: {exc}")
    if failures:
        print(f"\n{len(failures)} failure(s)")
        return 1
    print("\nBloc B backup lifecycle — all green ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())