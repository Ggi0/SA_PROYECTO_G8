import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from src.grpc.audit_http import start_audit_server

import grpc
import concurrent.futures
import threading
import time
import logging
from grpc_health.v1 import health_pb2, health_pb2_grpc
import notification_pb2_grpc
from src.grpc.notification_servicer import NotificationServicer
from src.email.sender import EmailSender
from src.db.connection import get_connection
from src.db.repository import NotificationRepository
import src.config as config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HealthServicer(health_pb2_grpc.HealthServicer):
    def Check(self, request, context):
        if request.service == "notification-service-readiness":
            try:
                with get_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
            except Exception:
                return health_pb2.HealthCheckResponse(
                    status=health_pb2.HealthCheckResponse.NOT_SERVING
                )

        return health_pb2.HealthCheckResponse(
            status=health_pb2.HealthCheckResponse.SERVING
        )

def worker_loop():
    """Worker que procesa la cola de notificaciones pendientes."""
    repo = NotificationRepository()
    sender = EmailSender()

    while True:
        try:
            pending = repo.get_pending_notifications(limit=10)
            for notif in pending:
                try:
                    message_id = sender.send(
                        to_email      = notif["recipient_email"],
                        subject       = notif["subject_template"],
                        template_file = notif["template_file"],
                        template_data = notif["template_data"]
                    )
                    repo.mark_sent(str(notif["notification_id"]), message_id)
                    logger.info(f"Enviado: {notif['notification_id']}")
                except Exception as e:
                    repo.mark_failed(str(notif["notification_id"]), str(e))
                    logger.error(f"Falló: {notif['notification_id']} | {e}")
        except Exception as e:
            logger.error(f"Error en worker: {e}")

        time.sleep(10)  # revisa cada 10 segundos

def serve():
    server = grpc.server(concurrent.futures.ThreadPoolExecutor(max_workers=10))
    health_pb2_grpc.add_HealthServicer_to_server(HealthServicer(), server)

    notification_pb2_grpc.add_NotificationServiceServicer_to_server(
        NotificationServicer(), server
    )
    server.add_insecure_port(f"[::]:{config.GRPC_PORT}")
    server.start()
    logger.info(f"gRPC server iniciado en puerto {config.GRPC_PORT}")

    # Worker en hilo separado
    worker_thread = threading.Thread(target=worker_loop, daemon=True)
    worker_thread.start()
    logger.info("Worker de notificaciones iniciado")
    audit_thread = threading.Thread(target=start_audit_server, daemon=True)
    audit_thread.start()
    logger.info("Audit HTTP server iniciado")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
