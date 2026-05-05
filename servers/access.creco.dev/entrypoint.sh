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

echo "Log file: $LOG_FILE ($(wc -l < "$LOG_FILE") lines)"

# Start GoAccess with --keep-last to prevent exit on EOF
# Use tail -F to continuously feed the log to GoAccess via pipe
echo "Starting GoAccess WebSocket server on port 7890..."
tail -F "$LOG_FILE" | goaccess \
  --real-time-html \
  --port=7890 \
  --ws-url="access.creco.dev:443/ws" \
  --output=/var/www/goaccess/index.html \
  --log-format=COMBINED \
  --anonymize-ip \
  ${GOACCESS_EXTRA_ARGS} &

# Give GoAccess time to start and generate initial report
sleep 3

# Verify the HTML was generated
if [ -f /var/www/goaccess/index.html ]; then
  echo "GoAccess report generated successfully"
else
  echo "WARNING: GoAccess report not found, generating static fallback..."
  goaccess "$LOG_FILE" \
    --output=/var/www/goaccess/index.html \
    --log-format=COMBINED 2>/dev/null || echo "<html><body><h1>GoAccess starting...</h1></body></html>" > /var/www/goaccess/index.html
fi

# Start nginx in foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
