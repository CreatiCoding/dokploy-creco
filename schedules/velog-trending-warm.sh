#!/bin/bash
set -euo pipefail

ENDPOINT="https://api.dokploy.creco.dev/velog-trending/week"

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Warming up velog-trending API..."

HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$ENDPOINT")

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "OK - HTTP $HTTP_STATUS"
else
  echo "FAIL - HTTP $HTTP_STATUS" >&2
  exit 1
fi
