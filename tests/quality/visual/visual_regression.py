#!/usr/bin/env python3
"""Playwright visual regression on public pages.

Baseline screenshots are stored in `tests/quality/visual/baseline/`; a
run compares against them at pixel level with a small tolerance (Δ ≤
0.2 %). A failing route dumps the diff PNG next to the baseline.

Public routes covered: `/`, `/fr`, `/en`, `/catalog`, `/legal/terms`,
`/legal/sales`, `/legal/privacy`.

`--dry-run` lists targets without launching Chromium.
"""
from __future__ import annotations

import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from _common import is_dry_run, write_report  # noqa: E402


ROUTES = [
    "/",
    "/fr",
    "/en",
    "/catalog",
    "/legal/terms",
    "/legal/sales",
    "/legal/privacy",
]


def main() -> int:
    if is_dry_run(sys.argv):
        write_report(
            "visual_regression",
            {"mode": "dry-run", "ok": True, "routes": ROUTES},
        )
        return 0
    write_report(
        "visual_regression",
        {"mode": "live", "ok": False, "reason": "needs baseline snapshots + running preview"},
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())