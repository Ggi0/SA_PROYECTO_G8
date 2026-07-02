# src/grpc/audit_http.py
import json
import logging
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

import src.config as config
from src.db.connection import get_connection

logger = logging.getLogger(__name__)


def get_audit_logs(limit=100, offset=0):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    log_id,
                    notification_id::text,
                    old_status,
                    new_status,
                    message,
                    created_at::text
                FROM notification.notification_audit_log
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset)
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]

            cur.execute("SELECT COUNT(*) FROM notification.notification_audit_log")
            total = cur.fetchone()[0]

    return rows, total


class AuditHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia logs HTTP

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path != "/audit/logs":
            self.send_response(404)
            self.end_headers()
            return

        params = parse_qs(parsed.query)
        limit  = int(params.get("limit",  ["100"])[0])
        offset = int(params.get("offset", ["0"])[0])

        try:
            logs, total = get_audit_logs(limit=limit, offset=offset)
            body = json.dumps({"data": logs, "total": total}, default=str).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        except Exception as e:
            logger.error(f"Error en audit HTTP: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())


def start_audit_server():
    port = int(os.getenv("AUDIT_HTTP_PORT", "8084"))
    server = HTTPServer(("0.0.0.0", port), AuditHandler)
    logger.info(f"Audit HTTP server escuchando en puerto {port}")
    server.serve_forever()
