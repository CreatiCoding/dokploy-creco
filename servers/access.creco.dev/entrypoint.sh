#!/bin/sh
set -e

mkdir -p /var/www/goaccess
mkdir -p /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Ensure log file exists with at least one line
if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found at $LOG_FILE."
  LOG_FILE="/tmp/access.log"
  echo "Using fallback log at $LOG_FILE"
fi

if [ ! -s "$LOG_FILE" ]; then
  echo '127.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET /health HTTP/1.1" 200 0 "-" "healthcheck"' > "$LOG_FILE"
  echo "Added seed log entry to prevent GoAccess from exiting on empty file"
fi

echo "Starting GoAccess real-time HTML report..."

# Start GoAccess in background (WebSocket on port 7890, HTML output)
goaccess "$LOG_FILE" \
  --real-time-html \
  --port=7890 \
  --ws-url="access.creco.dev:443/ws" \
  --output=/var/www/goaccess/index.html \
  --log-format=COMBINED \
  --anonymize-ip \
  ${GOACCESS_EXTRA_ARGS} &

# Start nginx in foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
