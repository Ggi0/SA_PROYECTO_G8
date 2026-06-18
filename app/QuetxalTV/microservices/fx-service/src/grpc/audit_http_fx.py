# src/grpc/audit_http.py
import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


def get_fx_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "fx_user"),
        password=os.getenv("DB_PASSWORD", "admin"),
        dbname=os.getenv("DB_NAME", "fx_db"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'fx')},public",
        cursor_factory=psycopg2.extras.RealDictCursor
    )


def get_audit_logs(limit=100, offset=0):
    conn = get_fx_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as total FROM fx.rate_request_log")
            total = cur.fetchone()["total"]

            cur.execute("""
                SELECT
                    log_id,
                    target_currency,
                    cache_hit,
                    rate_used::text,
                    requested_by,
                    requested_at::text
                FROM fx.rate_request_log
                ORDER BY requested_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))

            rows = [dict(r) for r in cur.fetchall()]
        return rows, total
    finally:
        conn.close()


class AuditHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

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
            rows, total = get_audit_logs(limit=limit, offset=offset)
            body = json.dumps({"data": rows, "total": total}, default=str).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        except Exception as e:
            logger.error(f"Error en audit HTTP FX: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())


def start_audit_server():
    port = int(os.getenv("AUDIT_HTTP_PORT", "8085"))
    server = HTTPServer(("0.0.0.0", port), AuditHandler)
    logger.info(f"[FX] Audit HTTP server escuchando en puerto {port}")
    server.serve_forever()


def start_audit_thread():
    t = threading.Thread(target=start_audit_server, daemon=True)
    t.start()
    return t
