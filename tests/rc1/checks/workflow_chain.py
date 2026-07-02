"""
RC1 — vérifie la chaîne chronologique pour chaque ref RC1 :
  orders.created_at
    ≤ automation_runs.started_at (payment-confirmed)
    ≤ automation_runs.completed_at
    ≤ iptv_accounts.created_at
    ≤ delivery_logs.sent_at
et que /track?ref=... répond 200 avec le ref dans la page.
"""
from __future__ import annotations
import json
import os
import pathlib
import sys
import urllib.request
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
import subprocess

OUT = ROOT / "out"


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(["psql", "-At", "-F", "\t", "-c", sql],
                       capture_output=True, text=True, check=True)
    return [line.split("\t") for line in r.stdout.strip().splitlines() if line]


def _iso(v: str | None) -> datetime | None:
    if not v or v == "":
        return None
    try:
        return datetime.fromisoformat(v.replace(" ", "T").replace("+00", "+00:00"))
    except Exception:
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception:
            return None


def _load_refs() -> list[str]:
    refs: list[str] = []
    for p in OUT.glob("scenario_*.json"):
        try:
            d = json.loads(p.read_text())
            if d.get("ok") and d.get("ref"):
                refs.append(d["ref"])
        except Exception:
            continue
    return refs


def _track_ok(base: str, ref: str) -> tuple[bool, int]:
    try:
        req = urllib.request.Request(f"{base.rstrip('/')}/track?ref={ref}",
                                     headers={"User-Agent": "rc1-check"})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode(errors="ignore")
            return (r.status == 200 and ref in body), r.status
    except Exception:
        return False, 0


def main() -> int:
    refs = _load_refs()
    base = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
    results: list[dict] = []
    all_ok = True

    for ref in refs:
        rows = q(f"""SELECT o.created_at,
                            (SELECT started_at FROM automation_runs
                              WHERE workflow_key='payment-confirmed'
                                AND payload->>'orderRef'='{ref}' AND status='completed'
                              ORDER BY started_at DESC LIMIT 1),
                            (SELECT finished_at FROM automation_runs
                              WHERE workflow_key='payment-confirmed'
                                AND payload->>'orderRef'='{ref}' AND status='completed'
                              ORDER BY finished_at DESC LIMIT 1),
                            (SELECT created_at FROM iptv_accounts WHERE order_id=o.id ORDER BY created_at ASC LIMIT 1),
                            (SELECT coalesce(sent_at, created_at) FROM delivery_logs
                              WHERE order_id=o.id
                              ORDER BY coalesce(sent_at, created_at) DESC LIMIT 1)
                     FROM orders o WHERE o.order_ref='{ref}'""")
        r0 = rows[0] if rows else ["", "", "", "", ""]
        times = {
            "order_created_at": _iso(r0[0]),
            "run_started_at": _iso(r0[1]),
            "run_completed_at": _iso(r0[2]),
            "account_created_at": _iso(r0[3]),
            "delivery_sent_at": _iso(r0[4]),
        }

        seq = [k for k, v in times.items() if v is not None]
        chain_ok = True
        prev = None
        for k in seq:
            v = times[k]
            if prev and v < prev:
                chain_ok = False
            prev = v

        required = ["order_created_at", "run_completed_at", "account_created_at", "delivery_sent_at"]
        missing = [k for k in required if times[k] is None]

        track_ok, track_code = _track_ok(base, ref)

        ok = not missing and chain_ok and track_ok
        all_ok = all_ok and ok
        results.append({
            "ref": ref,
            "ok": ok,
            "missing": missing,
            "chain_ok": chain_ok,
            "track_ok": track_ok,
            "track_http": track_code,
            "timestamps": {k: (v.isoformat() if v else None) for k, v in times.items()},
        })

    payload = {"ok": all_ok, "refs_checked": len(refs), "results": results}
    (OUT / "workflow-chain.json").write_text(json.dumps(payload, indent=2, default=str))
    print(f"[workflow-chain] refs={len(refs)} ok={all_ok}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())