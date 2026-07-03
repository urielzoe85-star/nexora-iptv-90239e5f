#!/usr/bin/env python3
"""Chaos scenario — Corrupted / replayed SebPay webhook.

1. Wrong HMAC → 401 + security_events `webhook.hmac_invalid` (warn).
2. Valid HMAC + consumed `event_id` → 200, no duplicate order.
"""
from __future__ import annotations

import sys

from _common import is_dry_run, write_report


def main() -> int:
    if is_dry_run(sys.argv):
        write_report("corrupt_webhook", {"mode": "dry-run", "ok": True})
        return 0
    write_report(
        "corrupt_webhook",
        {"mode": "live", "ok": False, "reason": "needs staging SEBPAY_SECRET_KEY"},
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())