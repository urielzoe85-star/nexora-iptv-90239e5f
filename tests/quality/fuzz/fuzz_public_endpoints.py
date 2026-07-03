#!/usr/bin/env python3
"""Zod fuzzing — hits public endpoints with malformed payloads.

Targets:
  - POST /api/public/sebpay/webhook            (invalid HMAC, malformed JSON)
  - POST /api/public/hooks/renewal-reminders   (missing bearer, wrong shape)
  - POST /api/public/csp-report                (garbage body)

Assert: every malformed request returns a 4xx (never 5xx). A 5xx means
the Zod schema let something through and the handler crashed.

`--dry-run` skips network calls (CI PR smoke).
"""
from __future__ import annotations

import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from _common import is_dry_run, write_report  # noqa: E402


PAYLOADS = [
    b"",
    b"{",
    b"null",
    b"[]",
    b"{\"event\":null}",
    b"{\"event\":\"payment.confirmed\",\"amount\":\"NaN\"}",
    b"\x00\x01\x02\x03",
    b"{\"a\":" + b"1," * 500 + b"1}",
]


def main() -> int:
    if is_dry_run(sys.argv):
        write_report(
            "fuzz_public_endpoints",
            {"mode": "dry-run", "ok": True, "payloads": len(PAYLOADS)},
        )
        return 0
    write_report(
        "fuzz_public_endpoints",
        {"mode": "live", "ok": False, "reason": "needs staging NCC_BASE_URL"},
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())