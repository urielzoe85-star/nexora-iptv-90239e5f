"""Signature HMAC SebPay pour forger un webhook rejouable en test."""
from __future__ import annotations
import hmac
import hashlib
import json
import os


def sebpay_signature(raw_body: str) -> str:
    secret = os.environ["SEBPAY_SECRET_KEY"].strip().strip("'\"")
    return hmac.new(secret.encode(), raw_body.encode(), hashlib.sha256).hexdigest()


def build_webhook(ref: str, *, status: str = "successful", transaction_id: str | None = None) -> tuple[str, str]:
    payload = {
        "transaction_id": transaction_id or f"txn_{ref}",
        "external_reference": ref,
        "status": status,
        "currency": "EUR",
        "amount": 1.00,
    }
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return raw, sebpay_signature(raw)