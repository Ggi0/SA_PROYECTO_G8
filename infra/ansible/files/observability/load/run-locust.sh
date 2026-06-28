#!/usr/bin/env bash
set -euo pipefail

HOST="${1:?Falta el host, p.ej. http://INGRESS_IP}"
USERS="${2:-200}"
SPAWN="${3:-20}"
TIME="${4:-3m}"
TS=$(date +%Y%m%d_%H%M%S)
OUT="/opt/observability/load/locust_report_${TS}.html"

cd "$(dirname "$0")"
locust -f locustfile.py --host "$HOST" \
  --users "$USERS" --spawn-rate "$SPAWN" --run-time "$TIME" \
  --headless --only-summary --html "$OUT"

echo "Reporte: $OUT"
