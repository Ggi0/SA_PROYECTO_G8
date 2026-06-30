#!/usr/bin/env bash
set -euo pipefail

HOST="${1:?Falta el host, p.ej. http://INGRESS_IP}"
USERS="${2:-200}"
SPAWN="${3:-20}"
TIME="${4:-3m}"
TS=$(date +%Y%m%d_%H%M%S)
OUT="${LOCUST_REPORT_DIR:-/tmp}/locust_report_${TS}.html"
LATEST_OUT="${LOCUST_REPORT_DIR:-/tmp}/locust_result.html"

cd "$(dirname "$0")"
mkdir -p "$(dirname "$OUT")"

./.venv/bin/locust -f locustfile.py --host "$HOST" \
  --users "$USERS" --spawn-rate "$SPAWN" --run-time "$TIME" \
  --headless --only-summary --html "$OUT" --exit-code-on-error 0

cp "$OUT" "$LATEST_OUT"

echo "Reporte: $OUT"
echo "Ultimo reporte: $LATEST_OUT"
