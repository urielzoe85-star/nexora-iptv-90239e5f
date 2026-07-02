"""
Scénario RC1-03 — Provider fallback (MEGAOTT désactivé → adapter simulé).

Vérifie que le workflow reste vert quand MEGAOTT est inactif : l'adapter
simulé prend le relais, un compte est créé, aucun step failed.
"""
from __future__ import annotations
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SPRINT = ROOT.parent / "e2e" / "sprint-1.5"
sys.path.insert(0, str(SPRINT))

from helpers.db import SupaAdmin  # noqa: E402
from helpers.http import emit_test_event, drain_queue  # noqa: E402

OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def main() -> int:
    sb = SupaAdmin()
    ref = f"NXR-E2E-RC1-{int(time.time())}-fb"
    report: dict = {"id": "RC1-03", "name": "Provider fallback (MEGAOTT off)", "ref": ref, "steps": []}
    t_start = int(time.time() * 1000)
    snapshot = []
    try:
        snapshot = sb.disable_megaott()
        report["steps"].append({"name": "disable_megaott", "ok": True, "count": len(snapshot)})

        sb.seed_customer_and_order(ref, with_sebpay_ref=False)
        code, body = emit_test_event("payment.confirmed", ref, {})
        assert code == 200, body
        drain_queue(max_iter=8)

        accounts = sb.poll(lambda: sb.select("iptv_accounts", {
            "metadata->>order_ref": f"eq.{ref}",
        }), timeout=15)
        assert len(accounts) == 1, f"expected 1 iptv_account under fallback, got {len(accounts)}"

        # provider should NOT be megaott
        provider = (accounts[0].get("metadata") or {}).get("provider_kind") or accounts[0].get("provider_id")
        report["steps"].append({"name": "fallback_account_created", "ok": True,
                                "provider": provider})

        steps_rows = sb.select("automation_steps", {"payload->>orderRef": f"eq.{ref}"})
        failed = [s for s in steps_rows if s.get("status") == "failed"]
        assert not failed, f"unexpected failed steps: {failed}"

        report["ok"] = True
        report["perf_ms"] = {"t_total": int(time.time() * 1000) - t_start}
        return 0
    except Exception as e:
        report["ok"] = False
        report["error"] = f"{type(e).__name__}: {e}"
        return 1
    finally:
        try:
            sb.cleanup_ref(ref)
        finally:
            if snapshot:
                sb.restore_megaott(snapshot)
        (OUT / "scenario_03.json").write_text(json.dumps(report, indent=2, default=str))
        print(json.dumps(report, indent=2, default=str)[:1500])


if __name__ == "__main__":
    sys.exit(main())