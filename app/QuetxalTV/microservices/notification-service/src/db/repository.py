import uuid
from src.db.connection import get_connection

class NotificationRepository:

    def queue_notification(self, user_id: str, recipient_email: str,
                           recipient_name: str, type_code: str,
                           template_data: dict) -> str:
        import json
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL sp_queue_notification(%s, %s, %s, %s, %s, NULL)",
                    (
                        user_id,
                        recipient_email,
                        recipient_name,
                        type_code,
                        json.dumps(template_data)
                    )
                )
                # El SP devuelve el notification_id en el OUT parameter
                cur.execute("SELECT lastval()")
                # Como es UUID usamos una consulta directa
                cur.execute(
                    """
                    SELECT notification_id FROM notifications
                    WHERE recipient_email = %s
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (recipient_email,)
                )
                row = cur.fetchone()
                return str(row[0]) if row else str(uuid.uuid4())

    def get_pending_notifications(self, limit: int = 10):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM fn_get_pending_notifications(%s)", (limit,))
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in cur.fetchall()]

    def mark_sent(self, notification_id: str, message_id: str):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL sp_mark_sent(%s, %s, %s)",
                    (notification_id, message_id, 'OK')
                )

    def mark_failed(self, notification_id: str, error_message: str):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL sp_mark_failed(%s, %s)",
                    (notification_id, error_message)
                )