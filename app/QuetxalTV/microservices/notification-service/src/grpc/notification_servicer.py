import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

import logging
import grpc
import notification_pb2
import notification_pb2_grpc
from src.db.repository import NotificationRepository

logger = logging.getLogger(__name__)

class NotificationServicer(notification_pb2_grpc.NotificationServiceServicer):
    def __init__(self):
        self.repo = NotificationRepository()

    def SendPurchaseReceipt(self, request, context):
        try:
            self.repo.queue_notification(
                user_id        = request.user_id,
                recipient_email= request.user_email,
                recipient_name = request.user_email,
                type_code      = "PURCHASE_RECEIPT",
                template_data  = {
                    "name":           request.user_email,
                    "plan_name":      request.plan_name,
                    "amount":         str(request.amount),
                    "currency":       request.currency,
                    "transaction_id": request.transaction_id
                }
            )
            return notification_pb2.SendPurchaseReceiptResponse(
                success=True,
                message="Notificación encolada correctamente"
            )
        except Exception as e:
            logger.error(f"Error en SendPurchaseReceipt: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return notification_pb2.SendPurchaseReceiptResponse(
                success=False, message=str(e)
            )

    def SendWelcomeEmail(self, request, context):
        try:
            self.repo.queue_notification(
                user_id        = request.user_id,
                recipient_email= request.user_email,
                recipient_name = request.user_name,
                type_code      = "WELCOME",
                template_data  = {
                    "name": request.user_name
                }
            )
            return notification_pb2.SendWelcomeEmailResponse(
                success=True,
                message="Notificación encolada correctamente"
            )
        except Exception as e:
            logger.error(f"Error en SendWelcomeEmail: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return notification_pb2.SendWelcomeEmailResponse(
                success=False, message=str(e)
            )
    def SendNewContentAlert(self, request, context):
        try:
            subscribers = self.repo.get_subscriber_emails()
            if not subscribers:
                return notification_pb2.NewContentAlertResponse(
                    success=True,
                    message="No hay suscriptores activos",
                    emails_sent=0
                )

            count = 0
            for sub in subscribers:
                try:
                    self.repo.queue_notification(
                        user_id         = sub["user_id"],
                        recipient_email = sub["email"],
                        recipient_name  = sub["name"] or sub["email"],
                        type_code       = "NEW_CONTENT",
                        template_data   = {
                            "name":          sub["name"] or "Suscriptor",
                            "content_title": request.content_title,
                            "content_type":  request.content_type,
                            "content_id":    request.content_id,
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Error encolando alerta para {sub['email']}: {e}")

            return notification_pb2.NewContentAlertResponse(
                success=True,
                message=f"Alertas encoladas para {count} suscriptores",
                emails_sent=count
            )
        except Exception as e:
            logger.error(f"Error en SendNewContentAlert: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return notification_pb2.NewContentAlertResponse(
                success=False, message=str(e), emails_sent=0
            )