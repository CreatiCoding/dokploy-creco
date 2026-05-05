#!/bin/sh
set -e

mkdir -p /var/www/goaccess
mkdir -p /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Wait for log file to exist
echo "Waiting for log file: $LOG_FILE"
while [ ! -f "$LOG_FILE" ]; do
  sleep 5
  echo "Log file not found yet, waiting..."
done

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
