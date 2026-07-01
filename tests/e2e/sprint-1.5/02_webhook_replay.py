"""
Scénario 2 — Webhook SebPay rejoué + signature invalide.

Étapes :
 1. Seed order NXR-E2E-<ts> avec sebpay_reference set.
 2. POST webhook signé x2 → 200 chaque fois, 2 receipts dans
    integration_debug_logs, signature_valid=true.
 3. POST webhook signé avec une signature volontairement fausse → 401,
    1 receipt supplémentaire avec signature_valid=false.
 4. Vérifie que la table iptv_accounts est TOUJOURS vide pour ce ref
    (verify upstream a échoué → workflow jamais déclenché, aucun double
    effet côté livraison).
 5. Cleanup.
"""
from __future__ import annotations
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from helpers.db import SupaAdmin  # noqa: E402
from helpers.http import sebpay_webhook  # noqa: E402
from helpers.signing import build_webhook  # noqa: E402

OUT = HERE / "out"
OUT.mkdir(exist_ok=True)


def main() -> int:
    sb = SupaAdmin()
    ref = f"NXR-E2E-{int(time.time())}"
    report: dict = {"ref": ref, "steps": []}
    try:
        sb.seed_customer_and_order(ref, with_sebpay_ref=True)

        raw, sig = build_webhook(ref, status="successful")

        code1, body1 = sebpay_webhook(raw, sig)
        code2, body2 = sebpay_webhook(raw, sig)
        code3, body3 = sebpay_webhook(raw, "deadbeef" * 8)  # fausse sig

        report["steps"] = [
            {"valid#1": {"status": code1, "body": body1[:200]}},
            {"valid#2": {"status": code2, "body": body2[:200]}},
            {"invalid": {"status": code3, "body": body3[:200]}},
        ]

        assert code1 == 200, f"webhook#1 expected 200, got {code1}"
        assert code2 == 200, f"webhook#2 expected 200, got {code2}"
        assert code3 == 401, f"invalid-sig expected 401, got {code3}"

        # Receipts en base
        logs = sb.select("integration_debug_logs", {
            "connector_id": "eq.payment.sebpay",
            "request_body->>ref": f"eq.{ref}",
        })
        valid_logs = [l for l in logs if (l.get("response_body") or {}).get("signature_valid") is True]
        invalid_logs = [l for l in logs if (l.get("response_body") or {}).get("signature_valid") is False]
        assert len(valid_logs) == 2, f"expected 2 valid receipts, got {len(valid_logs)}"
        # La signature invalide n'a pas de `ref` dans request_body (rejet
        # avant parsing du payload) — on la retrouve par rawPreview.
        raw_prev_logs = sb.select("integration_debug_logs", {
            "connector_id": "eq.payment.sebpay",
            "response_body->>signature_valid": "eq.false",
            "created_at": f"gte.{logs[0]['created_at'] if logs else '2020-01-01'}",
        })
        assert len(raw_prev_logs) >= 1, "no invalid-signature receipt found"

        # Zéro effet de bord côté livraison
        accounts = sb.select("iptv_accounts", {"metadata->>order_ref": f"eq.{ref}"})
        assert len(accounts) == 0, f"webhook replay must NOT create accounts, got {len(accounts)}"

        report["assertions"] = {
            "valid_receipts": len(valid_logs),
            "invalid_receipts": len(raw_prev_logs),
            "iptv_accounts_created": len(accounts),
        }
        report["ok"] = True
        return 0
    except Exception as e:
        report["ok"] = False
        report["error"] = f"{type(e).__name__}: {e}"
        print(report["error"])
        return 1
    finally:
        try:
            sb.cleanup_ref(ref)
        except Exception as e:
            print(f"[cleanup] {e}")
        (OUT / "02_webhook_replay.json").write_text(json.dumps(report, indent=2, default=str))
        print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    sys.exit(main())