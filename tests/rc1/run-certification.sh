#!/usr/bin/env bash
# RC1 Certification runner.
# Chaîne scénarios → checks DB/logs/chain → rapport final.
# Exit code != 0 si RC1 NOT CERTIFIED.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

mkdir -p out report screenshots
# On repart d'un état propre pour ne pas ré-utiliser des résultats précédents.
rm -f out/*.json report/index.html

need() {
  if [ -z "${!1:-}" ]; then
    echo "❌ Variable requise manquante: $1"
    MISSING=1
  fi
}
MISSING=0
need SUPABASE_URL
need SUPABASE_SERVICE_ROLE_KEY
need AUTOMATION_CRON_SECRET
need SEBPAY_SECRET_KEY
if [ "$MISSING" = "1" ]; then
  echo "→ Renseigne les variables ci-dessus puis relance."
  exit 2
fi
export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
# Keep seeded rows during the whole certification so the cross-scenario
# checks (workflow_chain, db_integrity, logs_audit) see real evidence.
# A final cleanup pass wipes every NXR-E2E-* row after the report is built.
export RC1_KEEP_DATA=1

FAIL=0
run() {
  echo ""
  echo "▶ $*"
  if ! python3 "$@"; then
    FAIL=1
    echo "⚠ étape en échec (le rapport final consolide toutes les erreurs)"
  fi
}

run scenarios/01_full_journey.py
run scenarios/02_webhook_replay.py
run scenarios/03_provider_fallback.py

run checks/db_integrity.py
run checks/workflow_chain.py
run checks/logs_audit.py

echo ""
echo "▶ Assemble le rapport final"
python3 checks/build_report.py
VERDICT=$?

echo ""
echo "▶ Cleanup final (rows NXR-E2E-*)"
PYTHONPATH="$HERE/../e2e/sprint-1.5" python3 -c "from helpers.db import SupaAdmin; SupaAdmin().cleanup_e2e_refs(); print('[cleanup-final] done')"

echo ""
echo "→ Markdown : $HERE/out/RC1-REPORT.md"
echo "→ HTML     : $HERE/report/index.html"
exit $VERDICT