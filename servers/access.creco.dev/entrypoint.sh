#!/bin/sh
set -e

mkdir -p /var/www/goaccess /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Ensure log file exists
if [ ! -f "$LOG_FILE" ]; then
  LOG_FILE="/tmp/access.log"
fi

if [ ! -s "$LOG_FILE" ]; then
  echo '127.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET /health HTTP/1.1" 200 0 "-" "healthcheck"' > "$LOG_FILE"
fi

echo "Using log file: $LOG_FILE ($(wc -l < "$LOG_FILE") lines)"

# Start GoAccess real-time (WebSocket on 7890, generates HTML)
goaccess "$LOG_FILE" \
  --real-time-html \
  --port=7890 \
  --ws-url=access.creco.dev:443/ws \
  --output=/var/www/goaccess/index.html \
  --log-format=COMBINED \
  --anonymize-ip &

sleep 2
echo "GoAccess started, report at /var/www/goaccess/index.html"

# Start nginx (serves HTML on 80, proxies /ws to GoAccess 7890)
exec nginx -g "daemon off;"
