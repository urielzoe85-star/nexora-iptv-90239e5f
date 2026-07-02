"""
RC1 — validation d'intégrité DB via psql (schéma réel du projet).

Contrôles :
  - orders            : status enum, email non-null, amount>0, doublons order_ref
  - iptv_accounts     : FK order_id valide, doublons (provider_id, lower(username))
  - automation_runs   : status != 'failed', payload->>orderRef pointe sur un order
  - automation_steps  : status != 'failed', run_id FK valide
  - delivery_logs     : FK order_id valide, channel connu
  - notifications     : status connu (table ne référence pas customer_id — voir mapping)
  - customer_events   : FK customer_id valide
  - integration_debug_logs : pas de ok=false 5xx sur les refs RC1

Écrit tests/rc1/out/db-integrity.json.
"""
from __future__ import annotations
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(["psql", "-At", "-F", "\t", "-c", sql],
                       capture_output=True, text=True, check=True)
    return [line.split("\t") for line in r.stdout.strip().splitlines() if line]


def scalar(sql: str) -> str:
    rows = q(sql)
    return rows[0][0] if rows else ""


def main() -> int:
    anomalies: list[dict] = []
    stats: dict = {}

    def add(sev, table, issue, **extra):
        anomalies.append({"severity": sev, "table": table, "issue": issue, **extra})

    # ---- orders (global + RC1)
    stats["orders_rc1"] = int(scalar("SELECT count(*) FROM orders WHERE order_ref LIKE 'NXR-E2E-RC1-%'"))
    for row in q("""SELECT order_ref, status, coalesce(email,''), amount
                    FROM orders WHERE order_ref LIKE 'NXR-E2E-RC1-%'"""):
        ref, status, email, amount = row
        if status not in ("pending", "processing", "paid", "delivered",
                          "failed", "cancelled", "refunded", "expired", "awaiting_payment"):
            add("critical", "orders", f"invalid status {status!r}", ref=ref)
        if not email:
            add("critical", "orders", "email is null", ref=ref)
        try:
            if float(amount) <= 0:
                add("critical", "orders", f"non-positive amount {amount}", ref=ref)
        except ValueError:
            add("critical", "orders", f"non-numeric amount {amount!r}", ref=ref)
    for row in q("""SELECT order_ref, count(*) FROM orders GROUP BY order_ref HAVING count(*)>1"""):
        add("critical", "orders", f"duplicate order_ref {row[0]} ({row[1]}x)")

    # ---- iptv_accounts orphans + duplicates
    stats["iptv_accounts_total"] = int(scalar("SELECT count(*) FROM iptv_accounts"))
    for row in q("""SELECT a.id FROM iptv_accounts a
                    LEFT JOIN orders o ON o.id = a.order_id
                    WHERE a.order_id IS NOT NULL AND o.id IS NULL"""):
        add("critical", "iptv_accounts", f"orphan order_id on account {row[0]}")
    for row in q("""SELECT provider_id, lower(username), count(*)
                    FROM iptv_accounts WHERE provider_id IS NOT NULL
                    GROUP BY provider_id, lower(username) HAVING count(*)>1"""):
        add("warning", "iptv_accounts",
            f"duplicate (provider_id, username)=({row[0]}, {row[1]}) ({row[2]}x)")

    # ---- automation_runs (RC1)
    stats["automation_runs_rc1"] = int(scalar("""
        SELECT count(*) FROM automation_runs
        WHERE payload->>'orderRef' LIKE 'NXR-E2E-RC1-%'"""))
    for row in q("""SELECT id, payload->>'orderRef', status, coalesce(error,'')
                    FROM automation_runs
                    WHERE payload->>'orderRef' LIKE 'NXR-E2E-RC1-%' AND status='failed'"""):
        add("critical", "automation_runs", f"run failed for {row[1]}",
            run_id=row[0], error=row[3][:300])
    for row in q("""SELECT r.id, r.payload->>'orderRef'
                    FROM automation_runs r
                    LEFT JOIN orders o ON o.order_ref = r.payload->>'orderRef'
                    WHERE r.payload->>'orderRef' LIKE 'NXR-E2E-RC1-%' AND o.id IS NULL"""):
        add("warning", "automation_runs", f"run for unknown ref {row[1]}", run_id=row[0])

    # ---- automation_steps (via run join, RC1 refs)
    stats["automation_steps_rc1"] = int(scalar("""
        SELECT count(*) FROM automation_steps s
        JOIN automation_runs r ON r.id = s.run_id
        WHERE r.payload->>'orderRef' LIKE 'NXR-E2E-RC1-%'"""))
    for row in q("""SELECT s.id, s.name, coalesce(s.error,''), r.payload->>'orderRef'
                    FROM automation_steps s
                    JOIN automation_runs r ON r.id = s.run_id
                    WHERE r.payload->>'orderRef' LIKE 'NXR-E2E-RC1-%' AND s.status='failed'"""):
        add("critical", "automation_steps",
            f"step {row[1]!r} failed for {row[3]}", step_id=row[0], error=row[2][:300])
    # dangling steps (run_id FK)
    for row in q("""SELECT s.id FROM automation_steps s
                    LEFT JOIN automation_runs r ON r.id = s.run_id
                    WHERE r.id IS NULL"""):
        add("critical", "automation_steps", f"dangling run_id on step {row[0]}")

    # ---- delivery_logs
    stats["delivery_logs_total"] = int(scalar("SELECT count(*) FROM delivery_logs"))
    for row in q("""SELECT d.id FROM delivery_logs d
                    LEFT JOIN orders o ON o.id = d.order_id
                    WHERE d.order_id IS NOT NULL AND o.id IS NULL"""):
        add("critical", "delivery_logs", f"orphan order_id on delivery {row[0]}")
    for row in q("""SELECT DISTINCT channel FROM delivery_logs"""):
        ch = row[0]
        if ch and ch not in ("email", "sms", "webhook", "manual", "portal", "in_app", "whatsapp"):
            add("warning", "delivery_logs", f"unknown channel {ch!r}")

    # ---- notifications (schema has no customer_id — only status sanity)
    stats["notifications_total"] = int(scalar("SELECT count(*) FROM notifications"))
    for row in q("""SELECT DISTINCT status FROM notifications WHERE status IS NOT NULL"""):
        st = row[0]
        if st not in ("pending", "queued", "sent", "delivered", "failed", "bounced", "skipped"):
            add("warning", "notifications", f"unknown status {st!r}")

    # ---- customer_events (FK customer_id)
    stats["customer_events_total"] = int(scalar("SELECT count(*) FROM customer_events"))
    for row in q("""SELECT e.id, e.customer_id FROM customer_events e
                    LEFT JOIN customers c ON c.id = e.customer_id
                    WHERE e.customer_id IS NOT NULL AND c.id IS NULL"""):
        add("critical", "customer_events", f"orphan customer_id {row[1]} on event {row[0]}")

    # ---- integration_debug_logs — 5xx on RC1 refs
    for row in q("""SELECT id, connector_id, status FROM integration_debug_logs
                    WHERE request_body::text LIKE '%NXR-E2E-RC1-%'
                      AND status IS NOT NULL AND status >= 500"""):
        add("critical", "integration_debug_logs",
            f"5xx from {row[1]} (status={row[2]})", log_id=row[0])

    critical = [a for a in anomalies if a["severity"] == "critical"]
    payload = {
        "ok": len(critical) == 0,
        "critical_count": len(critical),
        "warning_count": len(anomalies) - len(critical),
        "stats": stats,
        "anomalies": anomalies,
        "table_mapping": {
            "payments": "orders (sebpay_reference, method, amount, currency, status)",
            "audit_logs": "iptv_logs + automation_steps + integration_debug_logs",
        },
    }
    (OUT / "db-integrity.json").write_text(json.dumps(payload, indent=2, default=str))
    print(f"[db-integrity] critical={len(critical)} warnings={len(anomalies) - len(critical)}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())