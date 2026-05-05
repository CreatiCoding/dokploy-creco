#!/bin/sh
set -e

mkdir -p /var/www/goaccess
mkdir -p /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Ensure log file exists
if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found at $LOG_FILE. Creating empty file..."
  touch "$LOG_FILE" 2>/dev/null || {
    # If read-only mount, use a writable fallback
    LOG_FILE="/tmp/access.log"
    touch "$LOG_FILE"
    echo "Using fallback log at $LOG_FILE"
  }
fi

echo "Starting GoAccess real-time HTML report..."

exec goaccess "$LOG_FILE" \
  --config-file=/etc/goaccess/goaccess.conf \
  --real-time-html \
  --port=7890 \
  --ws-url="wss://${WS_URL:-access.creco.dev}" \
  --origin="https://${WS_URL:-access.creco.dev}" \
  --output=/var/www/goaccess/index.html \
  --log-format='%h - %^ [%d:%t %^] "%r" %s %b "%R" "%u"' \
  ${GOACCESS_EXTRA_ARGS}
