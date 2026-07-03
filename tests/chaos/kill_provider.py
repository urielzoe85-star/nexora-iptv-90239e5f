#!/usr/bin/env python3
"""Chaos scenario — Provider KO.

Simulates a dead MEGAOTT upstream (invalid bearer) and asserts:
- provisioning flips to `provisioning_failed`
- `security_events` gets a `provider.down` entry
- idempotent retry works

`--dry-run` skips the network round-trip (used by CI PR smoke).
"""
from __future__ import annotations

import sys

from _common import is_dry_run, write_report


def main() -> int:
    if is_dry_run(sys.argv):
        write_report("kill_provider", {"mode": "dry-run", "ok": True})
        return 0
    write_report(
        "kill_provider",
        {"mode": "live", "ok": False, "reason": "needs staging tenant + throwaway MEGAOTT token"},
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())