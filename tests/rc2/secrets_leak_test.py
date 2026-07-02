#!/usr/bin/env python3
"""Sprint 2 · Bloc F — Secrets leak scanner.

Scans:
  - Git-tracked source files
  - Client bundle (`dist/`, `.output/public`)
  - Build outputs (`.output/`, `.vite/`, `.tanstack/`)
  - Logs (`tests/reports/**/*.log`, `.output/**/*.log`)
  - Test artefacts (`tests/rc1/artifacts/`, `tests/rc2/artifacts/`)

Exit code:
  0 = no leak
  1 = potential leak detected (fails CI)
  2 = usage error

Options:
  --inventory : dump every `process.env.<NAME>` reference (does not fail)
"""
from __future__ import annotations

import os
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# High-signal regex patterns that indicate a real secret value in a file.
# We intentionally exclude bare env-var *names* to avoid false positives.
VALUE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("supabase_service_role_jwt", re.compile(r"eyJhbGciOi[\w-]{10,}\.[\w-]{20,}\.[\w-]{20,}")),
    ("supabase_secret_key",       re.compile(r"sb_secret_[A-Za-z0-9_-]{20,}")),
    ("supabase_publishable_prefix", re.compile(r"sbp_[A-Za-z0-9]{20,}")),
    ("stripe_live",               re.compile(r"sk_live_[A-Za-z0-9]{20,}")),
    ("github_pat",                re.compile(r"ghp_[A-Za-z0-9]{30,}")),
    ("private_key_block",         re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("telegram_bot_token",        re.compile(r"\b\d{9,10}:[A-Za-z0-9_-]{35}\b")),
    ("aws_access_key",            re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
]

# Bundle-only forbidden identifiers (names must never appear in shipped JS).
FORBIDDEN_IN_BUNDLE = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SEBPAY_SECRET_KEY",
    "MEGAOTT_BEARER_TOKEN",
    "EMAIL_CRON_SECRET",
    "AUTOMATION_CRON_SECRET",
    "NCC_ACCESS_PASSWORD",
    "email_queue_cron_secret",
    "email_queue_service_role_key",
]

SKIP_DIRS = {
    ".git", "node_modules", ".turbo", ".cache", ".claude", ".workspace",
    ".agents", "coverage",
}
SKIP_FILES = {
    "bun.lockb", "package-lock.json", "yarn.lock",
}

# Files that legitimately reference secret *names* (docs, tests, source
# using process.env). We skip value-pattern hits inside these when the hit
# is clearly the name and not a real value.
DOC_LIKE = re.compile(r"(docs/security/|tests/rc[12]/|README|SKILL\.md|\.md$)")


def git_tracked_files() -> list[Path]:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(ROOT), "ls-files"], text=True
        )
    except Exception:
        return []
    files: list[Path] = []
    for line in out.splitlines():
        p = ROOT / line
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.name in SKIP_FILES:
            continue
        if p.is_file():
            files.append(p)
    return files


def walk_paths(*roots: Path) -> list[Path]:
    out: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn in SKIP_FILES:
                    continue
                out.append(Path(dirpath) / fn)
    return out


def scan_values(files: list[Path], label: str) -> list[str]:
    hits: list[str] = []
    for f in files:
        try:
            data = f.read_text(errors="ignore")
        except Exception:
            continue
        rel = str(f.relative_to(ROOT)) if f.is_absolute() and str(f).startswith(str(ROOT)) else str(f)
        for name, pat in VALUE_PATTERNS:
            for m in pat.finditer(data):
                # Whitelist: docs/tests reference example / redacted values.
                snippet = m.group(0)
                if DOC_LIKE.search(rel) and ("example" in snippet.lower() or "xxxx" in snippet.lower()):
                    continue
                # Whitelist the project publishable anon key stored in .env
                # (publishable / low criticality — safe by design).
                if rel.endswith(".env") and name == "supabase_service_role_jwt":
                    # Any JWT in .env should still be reported to force review.
                    pass
                hits.append(f"[{label}] {rel} :: {name} :: {snippet[:40]}…")
    return hits


def scan_bundle_forbidden(files: list[Path]) -> list[str]:
    hits: list[str] = []
    for f in files:
        if f.suffix not in {".js", ".mjs", ".cjs", ".map", ".html"}:
            continue
        try:
            data = f.read_text(errors="ignore")
        except Exception:
            continue
        rel = str(f.relative_to(ROOT)) if str(f).startswith(str(ROOT)) else str(f)
        for name in FORBIDDEN_IN_BUNDLE:
            if name in data:
                hits.append(f"[bundle-forbidden] {rel} :: {name}")
    return hits


def inventory() -> list[str]:
    pat = re.compile(r"process\.env\.([A-Z_][A-Z0-9_]*)")
    seen: set[tuple[str, str]] = set()
    out: list[str] = []
    for f in git_tracked_files():
        if f.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
            continue
        try:
            data = f.read_text(errors="ignore")
        except Exception:
            continue
        rel = str(f.relative_to(ROOT))
        for m in pat.finditer(data):
            key = (rel, m.group(1))
            if key in seen:
                continue
            seen.add(key)
            out.append(f"{rel} :: {m.group(1)}")
    return sorted(out)


def main() -> int:
    if "--inventory" in sys.argv:
        for line in inventory():
            print(line)
        print(f"\nTotal references: {len(inventory())}")
        return 0

    all_hits: list[str] = []

    tracked = git_tracked_files()
    all_hits += scan_values(tracked, "repo")

    bundle_roots = [ROOT / "dist", ROOT / ".output" / "public"]
    bundle_files = walk_paths(*bundle_roots)
    all_hits += scan_values(bundle_files, "bundle")
    all_hits += scan_bundle_forbidden(bundle_files)

    build_roots = [ROOT / ".output", ROOT / ".vite", ROOT / ".tanstack"]
    all_hits += scan_values(walk_paths(*build_roots), "build")

    log_roots = [ROOT / "tests" / "reports", ROOT / ".output"]
    log_files = [p for p in walk_paths(*log_roots) if p.suffix in {".log", ".txt"}]
    all_hits += scan_values(log_files, "logs")

    artefact_roots = [
        ROOT / "tests" / "rc1" / "artifacts",
        ROOT / "tests" / "rc2" / "artifacts",
    ]
    all_hits += scan_values(walk_paths(*artefact_roots), "artefacts")

    if all_hits:
        print("Potential secret leaks detected:\n")
        for h in all_hits:
            print("  -", h)
        print(f"\nTotal: {len(all_hits)} hit(s)")
        return 1

    print("secrets_leak_test: OK — 0 leak across repo / bundle / build / logs / artefacts")
    return 0


if __name__ == "__main__":
    sys.exit(main())