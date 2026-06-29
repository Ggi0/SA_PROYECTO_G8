import logging
import os
import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Optional

logger = logging.getLogger("download-service.repository")


class DownloadRepository:

    def __init__(self):
        self.conn_string = (
            f"host={os.getenv('DB_HOST', 'localhost')} "
            f"port={os.getenv('DB_PORT', '5432')} "
            f"dbname={os.getenv('DB_NAME', 'downloads_db')} "
            f"user={os.getenv('DB_USER', 'downloads_user')} "
            f"password={os.getenv('DB_PASSWORD', '')} "
            f"sslmode={os.getenv('DB_SSLMODE', 'disable')}"
        )

    def _get_conn(self):
        return psycopg2.connect(
            self.conn_string,
            cursor_factory=psycopg2.extras.RealDictCursor
        )

    # ── Crear descarga ──────────────────────────────────

    def create_download(
        self,
        download_id: str,
        user_id: str,
        profile_id: str,
        content_id: str,
        gcs_url: str,
        expires_at: datetime,
        title: str = '',
        thumbnail: str = ''
    ) -> None:
        sql = """
            INSERT INTO downloads (
                download_id, user_id, profile_id, content_id,
                gcs_url, status, expires_at, created_at, title, thumbnail
            ) VALUES (
                %(download_id)s, %(user_id)s, %(profile_id)s, %(content_id)s,
                %(gcs_url)s, 'COMPLETED', %(expires_at)s, NOW(), %(title)s, %(thumbnail)s
            )
        """
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    "download_id": download_id,
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "content_id": content_id,
                    "gcs_url": gcs_url,
                    "expires_at": expires_at,
                    "title": title,
                    "thumbnail": thumbnail
                })
            conn.commit()

    # ── Buscar descarga activa existente ────────────────

    def find_active_download(
        self,
        user_id: str,
        profile_id: str,
        content_id: str
    ) -> Optional[dict]:
        sql = """
            SELECT * FROM downloads
            WHERE user_id    = %(user_id)s
              AND profile_id = %(profile_id)s
              AND content_id = %(content_id)s
              AND status     != 'DELETED'
              AND expires_at  > NOW()
            LIMIT 1
        """
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "content_id": content_id
                })
                return cur.fetchone()

    # ── Listar descargas de un perfil ───────────────────

    def get_downloads_by_profile(
        self,
        user_id: str,
        profile_id: str
    ) -> list:
        sql = """
            SELECT * FROM downloads
            WHERE user_id    = %(user_id)s
              AND profile_id = %(profile_id)s
              AND status     != 'DELETED'
              AND expires_at  > NOW()
            ORDER BY created_at DESC
        """
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    "user_id": user_id,
                    "profile_id": profile_id
                })
                return cur.fetchall()

    # ── Eliminación lógica ──────────────────────────────

    def soft_delete_download(
        self,
        download_id: str,
        user_id: str
    ) -> bool:
        sql = """
            UPDATE downloads
            SET status = 'DELETED', updated_at = NOW()
            WHERE download_id = %(download_id)s
              AND user_id     = %(user_id)s
              AND status      != 'DELETED'
        """
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    "download_id": download_id,
                    "user_id": user_id
                })
                affected = cur.rowcount
            conn.commit()
        return affected > 0

    # ── Purgar descargas expiradas (usado por cronjob) ──

    def purge_expired_downloads(self) -> int:
        sql = """
            UPDATE downloads
            SET status = 'DELETED', updated_at = NOW()
            WHERE expires_at < NOW()
              AND status     != 'DELETED'
        """
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                affected = cur.rowcount
            conn.commit()
        logger.info("Purga completada | %d descarga(s) expirada(s) eliminadas", affected)
        return affected
