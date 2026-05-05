#!/bin/sh
set -e

mkdir -p /var/www/goaccess
mkdir -p /tmp/goaccess-db

LOG_FILE="${ACCESS_LOG_PATH:-/var/log/traefik/access.log}"

# Wait for log file to exist (max 60 retries = 5 min)
echo "Waiting for log file: $LOG_FILE"
RETRIES=0
while [ ! -f "$LOG_FILE" ]; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge 60 ]; then
    echo "Log file not found after 5 minutes. Creating empty log file to start..."
    touch "$LOG_FILE"
    break
  fi
  sleep 5
  echo "Log file not found yet, waiting... ($RETRIES/60)"
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
