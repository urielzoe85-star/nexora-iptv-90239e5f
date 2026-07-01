"""
Scénario 1 — Happy path chemin critique (MEGAOTT désactivé pendant le run,
adapter tombe en mode simulé, aucun appel distant).

Étapes :
 1. Snapshot + désactive iptv_providers MEGAOTT (isReady=false).
 2. Seed customer + order NXR-E2E-<ts> (status=pending).
 3. Emit payment.confirmed via /api/public/automation/emit-test (bypass SebPay).
 4. Emit une 2ème fois (test d'idempotence: doit dédupliquer via
    automation_queue.idempotency_key).
 5. Drain /api/public/automation/process-queue.
 6. Assertions DB : 1 iptv_account, 1 automation_run completed, >=1 delivery_log,
    orders.metadata.iptv_delivery présent.
 7. Ouvre /track?ref=… via Playwright, screenshot.
 8. Cleanup (finally).
"""
from __future__ import annotations
import asyncio
import json
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from helpers.db import SupaAdmin  # noqa: E402
from helpers.http import emit_test_event, drain_queue, base_url  # noqa: E402

SCREENSHOTS = HERE / "screenshots"
SCREENSHOTS.mkdir(exist_ok=True)
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)


async def screenshot_track(ref: str) -> None:
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto(f"{base_url()}/track?ref={ref}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SCREENSHOTS / f"01_track_{ref}.png"))
        await browser.close()


def main() -> int:
    sb = SupaAdmin()
    ref = f"NXR-E2E-{int(time.time())}"
    report: dict = {"ref": ref, "steps": []}
    snapshot = []
    try:
        snapshot = sb.disable_megaott()
        report["steps"].append({"disable_megaott": len(snapshot)})

        seeded = sb.seed_customer_and_order(ref, with_sebpay_ref=False)
        report["steps"].append({"seed": seeded["order"]["order_ref"]})

        code, body = emit_test_event("payment.confirmed", ref, {
            "email": seeded["order"]["email"],
            "planName": seeded["order"]["plan_name"],
            "amount": 1.0,
            "currency": "EUR",
        })
        assert code == 200, f"emit#1 -> {code} {body}"
        # 2ème émission — l'idempotency_key doit dédupliquer.
        code2, body2 = emit_test_event("payment.confirmed", ref, {})
        assert code2 == 200, f"emit#2 -> {code2} {body2}"
        report["steps"].append({"emit": [code, code2]})

        drain = drain_queue(max_iter=6)
        report["steps"].append({"drain": drain})

        # Assertions
        accounts = sb.poll(lambda: sb.select("iptv_accounts", {
            "metadata->>order_ref": f"eq.{ref}",
        }), timeout=15)
        assert len(accounts) == 1, f"expected 1 iptv_account, got {len(accounts)}"

        runs = sb.select("automation_runs", {
            "workflow_key": "eq.payment-confirmed",
            "payload->>orderRef": f"eq.{ref}",
        })
        completed = [r for r in runs if r["status"] == "completed"]
        assert completed, f"no completed run found among {[r['status'] for r in runs]}"

        logs = sb.select("delivery_logs", {"order_ref": f"eq.{ref}"})
        assert len(logs) >= 1, "no delivery_logs entry"

        order_after = sb.select("orders", {"order_ref": f"eq.{ref}"})[0]
        delivery = (order_after.get("metadata") or {}).get("iptv_delivery")
        assert delivery, "orders.metadata.iptv_delivery missing"
        assert delivery.get("delivery_status") in {"ready_to_send", "sent"}, delivery

        report["assertions"] = {
            "iptv_accounts": len(accounts),
            "completed_runs": len(completed),
            "delivery_logs": len(logs),
            "delivery_status": delivery.get("delivery_status"),
        }

        asyncio.run(screenshot_track(ref))
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
        finally:
            if snapshot:
                sb.restore_megaott(snapshot)
        (OUT / "01_happy_path.json").write_text(json.dumps(report, indent=2, default=str))
        print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    sys.exit(main())