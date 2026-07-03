"""Shared helpers for the Sprint 3 · Bloc E chaos suite."""
from __future__ import annotations

import json
import os
import pathlib
import sys
import time
from datetime import datetime, timezone

REPORTS = pathlib.Path(__file__).parent / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)


def env(name: str, default: str | None = None) -> str:
    v = os.environ.get(name, default)
    if v is None:
        print(f"[chaos] missing env {name}", file=sys.stderr)
        sys.exit(2)
    return v


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_report(name: str, payload: dict) -> pathlib.Path:
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    path = REPORTS / f"{name}-{ts}.json"
    payload = {"scenario": name, "generated_at": now_iso(), **payload}
    path.write_text(json.dumps(payload, indent=2))
    print(f"[chaos] report → {path}")
    return path


def is_dry_run(argv: list[str]) -> bool:
    return "--dry-run" in argv