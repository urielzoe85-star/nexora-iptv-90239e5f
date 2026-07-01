"""HTTP helpers pour taper les endpoints publics de l'app."""
from __future__ import annotations
import json
import os
import urllib.request
import urllib.error


def base_url() -> str:
    return os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")


def _post(path: str, *, body: bytes | str, headers: dict) -> tuple[int, str]:
    url = f"{base_url()}{path}"
    data = body.encode() if isinstance(body, str) else body
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def emit_test_event(event: str, ref: str, payload: dict | None = None) -> tuple[int, str]:
    secret = os.environ["AUTOMATION_CRON_SECRET"]
    body = json.dumps({"event": event, "orderRef": ref, "payload": payload or {}})
    return _post("/api/public/automation/emit-test", body=body, headers={
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    })


def drain_queue(max_iter: int = 5) -> list[dict]:
    """Drain jusqu'à queue vide (ou max_iter). Retourne l'historique des runs."""
    secret = os.environ["AUTOMATION_CRON_SECRET"]
    results: list[dict] = []
    for i in range(max_iter):
        code, body = _post("/api/public/automation/process-queue", body="{}", headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        })
        if code != 200:
            raise RuntimeError(f"drain iter {i}: HTTP {code} — {body[:400]}")
        parsed = json.loads(body or "{}")
        results.append(parsed)
        if not parsed.get("processed"):
            break
    return results


def sebpay_webhook(raw: str, signature: str) -> tuple[int, str]:
    return _post("/api/public/sebpay/webhook", body=raw, headers={
        "Content-Type": "application/json",
        "X-SebPay-Signature": signature,
    })