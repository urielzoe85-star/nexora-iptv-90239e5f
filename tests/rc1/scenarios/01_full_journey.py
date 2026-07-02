"""
Scénario RC1-01 — Parcours complet Checkout → Payment → Workflow → IPTV → Delivery → Track.

Utilise le même chemin bypass que Sprint 1.5 (emit-test) parce que SebPay est
un service tiers qu'on ne joue pas en réel dans la CI. Le webhook réel est
couvert par le scénario RC1-02.

Mesure chaque étape et écrit :
  - out/scenario_01.json (steps, status, durées)
  - out/perf_01.json     (chrono par étape)
  - screenshots/rc1_01_*.png
"""
from __future__ import annotations
import asyncio
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SPRINT = ROOT.parent / "e2e" / "sprint-1.5"
sys.path.insert(0, str(SPRINT))

from helpers.db import SupaAdmin  # noqa: E402
from helpers.http import emit_test_event, drain_queue, base_url  # noqa: E402

SCREENSHOTS = ROOT / "screenshots"
OUT = ROOT / "out"
SCREENSHOTS.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)


def now_ms() -> int:
    return int(time.time() * 1000)


async def screenshot_track(ref: str) -> dict:
    from playwright.async_api import async_playwright
    result: dict = {"ok": False}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        t0 = now_ms()
        await page.goto(f"{base_url()}/track?ref={ref}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        shot = SCREENSHOTS / f"rc1_01_track_{ref}.png"
        await page.screenshot(path=str(shot))
        result = {
            "ok": True,
            "screenshot": shot.name,
            "duration_ms": now_ms() - t0,
            "url": page.url,
        }
        await browser.close()
    return result


def main() -> int:
    sb = SupaAdmin()
    ref = f"NXR-E2E-RC1-{int(time.time())}"
    report: dict = {
        "id": "RC1-01",
        "name": "Full journey — Checkout → Payment → Workflow → IPTV → Delivery → Track",
        "ref": ref,
        "steps": [],
    }
    perf: dict = {"ref": ref, "t_checkout": 0, "t_payment": 0, "t_workflow": 0,
                  "t_delivery": 0, "t_tracking": 0, "t_total": 0}
    snapshot = []
    t_start = now_ms()
    try:
        snapshot = sb.disable_megaott()
        report["steps"].append({"name": "disable_megaott", "ok": True, "count": len(snapshot)})

        # Checkout (seed order)
        t = now_ms()
        seeded = sb.seed_customer_and_order(ref, with_sebpay_ref=False)
        perf["t_checkout"] = now_ms() - t
        report["steps"].append({"name": "checkout_seed", "ok": True,
                                "order_ref": seeded["order"]["order_ref"],
                                "duration_ms": perf["t_checkout"]})

        # Payment (emit payment.confirmed)
        t = now_ms()
        code, body = emit_test_event("payment.confirmed", ref, {
            "email": seeded["order"]["email"],
            "planName": seeded["order"]["plan_name"],
            "amount": 1.0,
            "currency": "EUR",
        })
        perf["t_payment"] = now_ms() - t
        assert code == 200, f"emit -> {code} {body}"
        report["steps"].append({"name": "payment_emit", "ok": True,
                                "http": code, "duration_ms": perf["t_payment"]})

        # Workflow (drain queue)
        t = now_ms()
        drain = drain_queue(max_iter=8)
        perf["t_workflow"] = now_ms() - t
        report["steps"].append({"name": "workflow_drain", "ok": True,
                                "iterations": len(drain), "duration_ms": perf["t_workflow"]})

        # Delivery + IPTV assign (poll DB)
        t = now_ms()
        accounts = sb.poll(lambda: sb.select("iptv_accounts", {
            "metadata->>order_ref": f"eq.{ref}",
        }), timeout=15)
        assert len(accounts) == 1, f"expected 1 iptv_account, got {len(accounts)}"

        logs = sb.poll(lambda: sb.select("delivery_logs", {"order_ref": f"eq.{ref}"}), timeout=15)
        assert len(logs) >= 1, "no delivery_logs entry"

        order_after = sb.select("orders", {"order_ref": f"eq.{ref}"})[0]
        delivery = (order_after.get("metadata") or {}).get("iptv_delivery")
        assert delivery, "orders.metadata.iptv_delivery missing"
        assert delivery.get("delivery_status") in {"ready_to_send", "sent"}, delivery
        perf["t_delivery"] = now_ms() - t
        report["steps"].append({"name": "delivery_ready", "ok": True,
                                "delivery_status": delivery.get("delivery_status"),
                                "iptv_accounts": len(accounts),
                                "delivery_logs": len(logs),
                                "duration_ms": perf["t_delivery"]})

        # Tracking
        track = asyncio.run(screenshot_track(ref))
        perf["t_tracking"] = track["duration_ms"]
        report["steps"].append({"name": "tracking_visible", "ok": True,
                                "screenshot": track["screenshot"],
                                "url": track["url"],
                                "duration_ms": perf["t_tracking"]})

        perf["t_total"] = now_ms() - t_start
        report["ok"] = True
        report["perf_ms"] = perf
        return 0
    except Exception as e:
        report["ok"] = False
        report["error"] = f"{type(e).__name__}: {e}"
        perf["t_total"] = now_ms() - t_start
        report["perf_ms"] = perf
        return 1
    finally:
        try:
            sb.cleanup_ref(ref)
        finally:
            if snapshot:
                sb.restore_megaott(snapshot)
        (OUT / "scenario_01.json").write_text(json.dumps(report, indent=2, default=str))
        (OUT / "perf_01.json").write_text(json.dumps(perf, indent=2))
        print(json.dumps(report, indent=2, default=str)[:2000])


if __name__ == "__main__":
    sys.exit(main())