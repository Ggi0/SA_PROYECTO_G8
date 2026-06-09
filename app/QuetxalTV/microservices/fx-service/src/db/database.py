import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# ─── Conexión a PostgreSQL ───────────────────────────────
class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        """Establece conexión con PostgreSQL."""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv("DB_HOST"),
                port=int(os.getenv("DB_PORT", 5432)),
                dbname=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD")
            )
            print("[DB] Conexión exitosa a PostgreSQL")
        except Exception as e:
            print(f"[DB] Error al conectar: {e}")
            self.conn = None

    def ensure_connection(self):
        """Reconecta si la conexión se perdió."""
        try:
            if self.conn is None or self.conn.closed:
                self.connect()
            else:
                self.conn.cursor().execute("SELECT 1")
        except Exception:
            self.connect()

    def get_latest_rate(self, currency: str) -> dict | None:
        """Obtiene el tipo de cambio más reciente de PostgreSQL (fallback)."""
        try:
            self.ensure_connection()
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT er.target_currency, er.rate, er.source_provider,
                           er.valid_at, er.fetched_at,
                           c.currency_name, c.symbol
                    FROM fx.exchange_rates er
                    JOIN fx.currencies c ON er.target_currency = c.currency_code
                    WHERE er.target_currency = %s
                    ORDER BY er.fetched_at DESC
                    LIMIT 1
                """, (currency,))
                row = cur.fetchone()
                return dict(row) if row else None
        except Exception as e:
            print(f"[DB] Error al obtener rate: {e}")
            return None

    def get_all_currencies(self) -> list:
        """Obtiene todas las divisas activas."""
        try:
            self.ensure_connection()
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT currency_code, currency_name, symbol
                    FROM fx.currencies
                    WHERE is_active = TRUE
                """)
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            print(f"[DB] Error al obtener currencies: {e}")
            return []

    def save_rate(self, currency: str, rate: float,
                  source: str, valid_at: datetime,
                  requested_by: str = None):
        """Llama al procedimiento almacenado sp_save_rate."""
        try:
            self.ensure_connection()
            with self.conn.cursor() as cur:
                cur.execute("""
                    CALL fx.sp_save_rate(%s, %s, %s, %s, %s)
                """, (currency, rate, source, valid_at, requested_by))
            self.conn.commit()
        except Exception as e:
            print(f"[DB] Error al guardar rate: {e}")
            if self.conn:
                self.conn.rollback()

    def log_cache_hit(self, currency: str, rate: float, requested_by: str = None):
        """Registra un cache hit en el log."""
        try:
            self.ensure_connection()
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO fx.rate_request_log
                        (target_currency, cache_hit, rate_used, requested_by)
                    VALUES (%s, TRUE, %s, %s)
                """, (currency, rate, requested_by))
            self.conn.commit()
        except Exception as e:
            print(f"[DB] Error al loguear cache hit: {e}")
            if self.conn:
                self.conn.rollback()


# ─── Instancia global ────────────────────────────────────
db = Database()