import uuid
from src.db.connection import get_connection

class NotificationRepository:
    def __init__(self):
        self.ensure_notification_types()

    def ensure_notification_types(self):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notification.notification_types(
                        type_code, description, template_file, subject_template, is_active
                    )
                    VALUES
                        ('WELCOME', 'Correo de bienvenida', 'welcome.html', 'Bienvenido a Quetxal TV, {{name}}', TRUE),
                        ('PURCHASE_RECEIPT', 'Recibo de compra', 'purchase.html', 'Recibo de compra - {{plan_name}}', TRUE)
                    ON CONFLICT (type_code) DO UPDATE SET
                        description = EXCLUDED.description,
                        template_file = EXCLUDED.template_file,
                        subject_template = EXCLUDED.subject_template,
                        is_active = TRUE
                    """
                )

    def queue_notification(self, user_id: str, recipient_email: str,
                       recipient_name: str, type_code: str,
                       template_data: dict) -> str:
        import json
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Usar el SP que devuelve el notification_id como OUT parameter
                cur.execute(
                    """
                    DO $$
                    DECLARE
                        v_id UUID;
                    BEGIN
                        CALL notification.sp_queue_notification(%s, %s, %s, %s, %s, v_id);
                    END $$;
                    """,
                    (
                        user_id,
                        recipient_email,
                        recipient_name,
                        type_code,
                        json.dumps(template_data)
                    )
                )
                # Obtener el ID recién insertado
                cur.execute(
                    """
                    SELECT notification_id FROM notification.notifications
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
                cur.execute("SELECT * FROM notification.fn_get_pending_notifications(%s)", (limit,))
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in cur.fetchall()]

    def mark_sent(self, notification_id: str, message_id: str):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL notification.sp_mark_sent(%s, %s, %s)",
                    (notification_id, message_id, 'OK')
                )

    def mark_failed(self, notification_id: str, error_message: str):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL notification.sp_mark_failed(%s, %s)",
                    (notification_id, error_message)
                )
