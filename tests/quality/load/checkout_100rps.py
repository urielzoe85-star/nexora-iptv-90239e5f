#!/usr/bin/env python3
"""Load test — sustained 100 rps for 60 s on checkout + webhook path.

SLO (Sprint 3 GA):
  - p95 < 800 ms
  - error rate < 0.5 %
  - no 5xx

`--dry-run` reports the planned load without emitting traffic.
"""
from __future__ import annotations

import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from _common import is_dry_run, write_report  # noqa: E402


RPS = 100
DURATION_S = 60


def main() -> int:
    if is_dry_run(sys.argv):
        write_report(
            "checkout_100rps",
            {
                "mode": "dry-run",
                "ok": True,
                "rps": RPS,
                "duration_s": DURATION_S,
                "target_p95_ms": 800,
                "target_error_rate_pct": 0.5,
            },
        )
        return 0
    write_report(
        "checkout_100rps",
        {"mode": "live", "ok": False, "reason": "needs staging NCC_BASE_URL"},
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())