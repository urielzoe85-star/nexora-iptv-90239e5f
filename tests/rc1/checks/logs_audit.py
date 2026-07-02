"""
RC1 — audit des logs applicatifs sur la fenêtre du run.

Cherche pour les refs RC1 :
  - iptv_logs.level in ('error','critical')
  - automation_steps.status='failed'
  - automation_runs.status='failed'
  - automation_queue.status='dead_letter' / attempts>=max_attempts
  - integration_debug_logs: response_status>=500 ou message contient
    'exception' / 'unhandled' / 'promise rejection'
"""
from __future__ import annotations
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "out"
CRITICAL_RE = re.compile(r"(exception|unhandled|promise rejection|traceback|fatal)", re.I)


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(["psql", "-At", "-F", "\t", "-c", sql],
                       capture_output=True, text=True, check=True)
    return [line.split("\t") for line in r.stdout.strip().splitlines() if line]


def main() -> int:
    anomalies: list[dict] = []

    # iptv_logs — errors linked to RC1 refs (action='error' or message mentions RC1)
    for row in q("""SELECT id, action, coalesce(message,''), coalesce(payload::text,'{}')
                    FROM iptv_logs
                    WHERE (action ILIKE '%error%' OR action ILIKE '%fail%')
                      AND (message ILIKE '%NXR-E2E-RC1-%' OR payload::text ILIKE '%NXR-E2E-RC1-%')
                    ORDER BY created_at DESC LIMIT 200"""):
        anomalies.append({"severity": "critical", "source": "iptv_logs",
                          "id": row[0], "action": row[1], "message": row[2][:300]})

    # automation_steps failed for RC1 refs
    for row in q("""SELECT s.id, s.name, coalesce(s.error,''), r.payload->>'orderRef'
                    FROM automation_steps s
                    JOIN automation_runs r ON r.id = s.run_id
                    WHERE r.payload->>'orderRef' LIKE 'NXR-E2E-RC1-%' AND s.status='failed'"""):
        anomalies.append({"severity": "critical", "source": "automation_steps",
                          "id": row[0], "step": row[1], "ref": row[3], "error": row[2][:300]})

    # automation_runs failed for RC1
    for row in q("""SELECT id, workflow_key, coalesce(error,''), payload->>'orderRef'
                    FROM automation_runs
                    WHERE payload->>'orderRef' LIKE 'NXR-E2E-RC1-%' AND status='failed'"""):
        anomalies.append({"severity": "critical", "source": "automation_runs",
                          "id": row[0], "workflow": row[1], "ref": row[3], "error": row[2][:300]})

    # automation_queue — dead letters / attempts exhausted
    for row in q("""SELECT id, status, attempts, max_attempts, coalesce(last_error,''),
                           payload->>'orderRef'
                    FROM automation_queue
                    WHERE payload->>'orderRef' LIKE 'NXR-E2E-RC1-%'
                      AND (status IN ('dead_letter','failed') OR attempts >= max_attempts)"""):
        anomalies.append({"severity": "critical", "source": "automation_queue",
                          "id": row[0], "status": row[1], "attempts": f"{row[2]}/{row[3]}",
                          "ref": row[5], "error": row[4][:300]})

    # integration_debug_logs — 5xx or ok=false on RC1 refs
    for row in q("""SELECT id, connector_id, status, ok, coalesce(error,''),
                           coalesce(response_body::text,'')
                    FROM integration_debug_logs
                    WHERE request_body::text LIKE '%NXR-E2E-RC1-%'
                    ORDER BY created_at DESC LIMIT 200"""):
        try:
            status = int(row[2]) if row[2] else 0
        except ValueError:
            status = 0
        ok = row[3] == "t"
        excerpt = row[4] or row[5][:200]
        if status >= 500:
            anomalies.append({"severity": "critical", "source": "integration_debug_logs",
                              "connector": row[1], "status": status, "excerpt": excerpt[:200]})
        elif not ok and CRITICAL_RE.search(excerpt):
            anomalies.append({"severity": "warning", "source": "integration_debug_logs",
                              "connector": row[1], "excerpt": excerpt[:200]})

    critical = [a for a in anomalies if a.get("severity") == "critical"]
    payload = {
        "ok": len(critical) == 0,
        "critical_count": len(critical),
        "warning_count": len(anomalies) - len(critical),
        "anomalies": anomalies,
    }
    (OUT / "logs-audit.json").write_text(json.dumps(payload, indent=2, default=str))
    print(f"[logs-audit] critical={len(critical)} warnings={len(anomalies) - len(critical)}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())