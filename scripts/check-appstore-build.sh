#!/usr/bin/env bash
# Anti-fuite : après un build App Store, refuser tout terme prohibé.
set -euo pipefail
DIST="${1:-dist}"
if [ ! -d "$DIST" ]; then
  echo "ERR: $DIST introuvable — lance d'abord: VITE_APP_STORE_MODE=1 bun run build"
  exit 2
fi
PATTERN='iptv|m3u8?|xtream|cha[iî]ne[s]?[[:space:]]*tv|bouquet|revendeur|reseller|epg|smart[[:space:]]*iptv|vod|d[eé]codeur|smarters?[[:space:]]*pro|tivimate'
echo "🔎 Scan $DIST pour termes IPTV/reseller/M3U/etc."
if grep -riEIl --include='*.html' --include='*.js' --include='*.css' --include='*.json' --include='*.webmanifest' --include='*.txt' --include='*.xml' "$PATTERN" "$DIST"; then
  echo "❌ FAIL — au moins un terme prohibé subsiste dans $DIST"
  echo "Vérifie les fichiers ci-dessus et complète le SANITIZE_DICT si nécessaire."
  exit 1
fi
echo "✅ OK — aucun terme prohibé trouvé dans $DIST"
