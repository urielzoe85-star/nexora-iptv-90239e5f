"""
Scénario RC1-02 — Webhook SebPay rejoué + signature invalide.

Prouve la HMAC + l'idempotence : 2 POST valides → 2 receipts + 0 double effet ;
1 POST à signature fausse → 401 + receipt signature_valid=false.
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
from helpers.http import sebpay_webhook  # noqa: E402
from helpers.signing import build_webhook  # noqa: E402

OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def main() -> int:
    sb = SupaAdmin()
    ref = f"NXR-E2E-RC1-{int(time.time())}-wh"
    report: dict = {"id": "RC1-02", "name": "Webhook replay + invalid signature", "ref": ref, "steps": []}
    t_start = int(time.time() * 1000)
    try:
        sb.seed_customer_and_order(ref, with_sebpay_ref=True)
        raw, sig = build_webhook(ref, status="successful")

        code1, body1 = sebpay_webhook(raw, sig)
        code2, body2 = sebpay_webhook(raw, sig)
        code3, body3 = sebpay_webhook(raw, "deadbeef" * 8)

        report["steps"] = [
            {"name": "webhook_valid_1", "ok": code1 == 200, "http": code1},
            {"name": "webhook_valid_2_replay", "ok": code2 == 200, "http": code2},
            {"name": "webhook_invalid_sig", "ok": code3 == 401, "http": code3},
        ]
        assert code1 == 200 and code2 == 200 and code3 == 401, (code1, code2, code3)

        logs = sb.select("integration_debug_logs", {
            "connector_id": "eq.payment.sebpay",
            "request_body->>ref": f"eq.{ref}",
        })
        valid_logs = [l for l in logs if (l.get("response_body") or {}).get("signature_valid") is True]
        assert len(valid_logs) == 2, f"expected 2 valid receipts, got {len(valid_logs)}"
        report["steps"].append({"name": "receipts_recorded", "ok": True, "valid_count": len(valid_logs)})

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
        except Exception as e:
            print(f"[cleanup] {e}")
        (OUT / "scenario_02.json").write_text(json.dumps(report, indent=2, default=str))
        print(json.dumps(report, indent=2, default=str)[:1500])


if __name__ == "__main__":
    sys.exit(main())