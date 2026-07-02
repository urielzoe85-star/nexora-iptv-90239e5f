"""Sprint 2 — Bloc B : vérifie la présence des security headers.

Usage : `python tests/rc2/security_headers_test.py`
Requiert un serveur local (`E2E_BASE_URL`, défaut http://localhost:8080).
Sort en code 0 si tous les headers attendus sont présents sur toutes les routes.
"""
from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")

# Routes couvrant SSR (pages publiques), server-route API et route i18n.
ROUTES = [
    ("/", "GET"),
    ("/en", "GET"),
    ("/catalog", "GET"),
    ("/sitemap.xml", "GET"),
    ("/api/public/sebpay/webhook", "POST"),  # signature invalide -> 401, mais headers présents
]

REQUIRED_HEADERS = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
]
# HSTS n'est envoyé qu'en HTTPS ; on l'exige uniquement si BASE est https.
HTTPS = BASE.startswith("https://")
if HTTPS:
    REQUIRED_HEADERS.append("Strict-Transport-Security")


def fetch(path: str, method: str):
    req = urllib.request.Request(
        f"{BASE}{path}",
        method=method,
        data=b"{}" if method == "POST" else None,
        headers={"Content-Type": "application/json"} if method == "POST" else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers)


def main() -> int:
    failures: list[str] = []
    for path, method in ROUTES:
        try:
            status, headers = fetch(path, method)
        except Exception as e:  # noqa: BLE001
            failures.append(f"{method} {path}: request failed — {e}")
            continue
        missing = [h for h in REQUIRED_HEADERS if h not in headers]
        if missing:
            failures.append(f"{method} {path} (HTTP {status}): missing {missing}")
        else:
            print(f"OK  {method} {path} (HTTP {status})")

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f" - {f}")
        return 1
    print(f"\nAll {len(ROUTES)} routes carry required security headers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())