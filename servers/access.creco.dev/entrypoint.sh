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
  echo "Added seed log entry"
fi

echo "Log file: $LOG_FILE"
echo "Contents: $(wc -l < "$LOG_FILE") lines"

# Generate initial HTML report (non-realtime first)
echo "Generating initial HTML report..."
goaccess "$LOG_FILE" \
  --output=/var/www/goaccess/index.html \
  --log-format=COMBINED \
  --anonymize-ip 2>&1 || echo "Initial report generation failed, continuing..."

# Start GoAccess real-time in background
echo "Starting GoAccess WebSocket server on port 7890..."
goaccess "$LOG_FILE" \
  --real-time-html \
  --port=7890 \
  --ws-url="access.creco.dev:443/ws" \
  --output=/var/www/goaccess/index.html \
  --log-format=COMBINED \
  --anonymize-ip \
  ${GOACCESS_EXTRA_ARGS} 2>&1 &

GOACCESS_PID=$!
echo "GoAccess started with PID $GOACCESS_PID"

# Wait a moment and verify GoAccess is running
sleep 2
if kill -0 $GOACCESS_PID 2>/dev/null; then
  echo "GoAccess is running"
else
  echo "WARNING: GoAccess exited! Starting nginx anyway with static report."
fi

# Start nginx in foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
