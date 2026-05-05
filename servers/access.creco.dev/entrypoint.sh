#!/bin/sh
set -e

mkdir -p /var/www/goaccess
mkdir -p /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Ensure log file exists
if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found at $LOG_FILE. Creating empty file..."
  touch "$LOG_FILE" 2>/dev/null || {
    LOG_FILE="/tmp/access.log"
    touch "$LOG_FILE"
    echo "Using fallback log at $LOG_FILE"
  }
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
