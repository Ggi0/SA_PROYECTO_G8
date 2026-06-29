import grpc
import logging
import os
import uuid
from datetime import datetime, timedelta

import download_pb2
import download_pb2_grpc
from repository import DownloadRepository

logger = logging.getLogger("download-service.service")

ALLOWED_PLAN = 3  # PLAN_PREMIUM

BLOCKED_MESSAGES = {
    1: (
        "El Plan Básico no incluye descarga de contenido. "
        "Actualiza al Plan Premium para ver contenido sin conexión."
    ),
    2: (
        "El Plan Estándar no incluye descarga de contenido. "
        "Actualiza al Plan Premium para ver contenido sin conexión."
    ),
}

DOWNLOAD_EXPIRY_DAYS = int(os.getenv("DOWNLOAD_EXPIRY_DAYS", "30"))
GCS_BUCKET = os.getenv("GCS_BUCKET", "LOCAL_MODE")


def is_plan_allowed(plan: int) -> bool:
    return plan == ALLOWED_PLAN


def get_blocked_message(plan: int) -> str:
    return BLOCKED_MESSAGES.get(plan, "Plan de suscripción no válido.")


class DownloadService(download_pb2_grpc.DownloadServiceServicer):

    def __init__(self):
        self.repo = DownloadRepository()

    def InitiateDownload(self, request, context):
        logger.info(
            "InitiateDownload | user=%s content=%s title=%s plan=%s",
            request.user_id, request.content_id, 
            getattr(request, 'title', 'SIN_TITULO'),  # ← agregar
            request.plan
        )

        if not is_plan_allowed(request.plan):
            msg = get_blocked_message(request.plan)
            logger.warning("Bloqueado | user=%s plan=%s", request.user_id, request.plan)
            return download_pb2.InitiateDownloadResponse(
                allowed=False,
                message=msg
            )

        existing = self.repo.find_active_download(
            request.user_id, request.profile_id, request.content_id
        )
        if existing:
            return download_pb2.InitiateDownloadResponse(
                allowed=True,
                download_id=existing["download_id"],
                message="Ya tienes este contenido descargado.",
                gcs_url=existing["gcs_url"],
                expires_at=int(existing["expires_at"].timestamp())
            )

        download_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=DOWNLOAD_EXPIRY_DAYS)

        if GCS_BUCKET != "LOCAL_MODE" and GCS_BUCKET != "":
            gcs_url = (
                f"https://storage.googleapis.com/{GCS_BUCKET}"
                f"/{request.user_id}/{request.content_id}.enc"
            )
        else:
            gcs_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

        self.repo.create_download(
            download_id=download_id,
            user_id=request.user_id,
            profile_id=request.profile_id,
            content_id=request.content_id,
            gcs_url=gcs_url,
            expires_at=expires_at,
            title=getattr(request, 'title', ''),
            thumbnail=getattr(request, 'thumbnail', '')
        )

        return download_pb2.InitiateDownloadResponse(
            allowed=True,
            download_id=download_id,
            message=f"Descarga iniciada. Disponible sin conexión por {DOWNLOAD_EXPIRY_DAYS} días.",
            gcs_url=gcs_url,
            expires_at=int(expires_at.timestamp())
        )

    def ListDownloads(self, request, context):
        logger.info(
            "ListDownloads | user=%s profile=%s plan=%s",
            request.user_id, request.profile_id, request.plan
        )

        if not is_plan_allowed(request.plan):
            return download_pb2.ListDownloadsResponse(
                allowed=False,
                message=get_blocked_message(request.plan)
            )

        records = self.repo.get_downloads_by_profile(
            request.user_id, request.profile_id
        )

        items = [
                download_pb2.DownloadItem(
                    download_id=r["download_id"],
                    content_id=r["content_id"],
                    title=r["title"] or "",
                    thumbnail=r["thumbnail"] or "",
                    status={
                        "QUEUED": 1, "PENDING": 2, "COMPLETED": 3,
                        "FAILED": 4, "DELETED": 5
                    }.get(str(r["status"]), 0),
                    created_at=int(r["created_at"].timestamp()),
                    expires_at=int(r["expires_at"].timestamp()),
                    size_bytes=r["size_bytes"] or 0,
                    gcs_url=r["gcs_url"] or ""   # ← agregar
                )
                for r in records
            ]
        return download_pb2.ListDownloadsResponse(
            allowed=True,
            message=f"{len(items)} descarga(s) encontrada(s).",
            downloads=items
        )

    def DeleteDownload(self, request, context):
        logger.info(
            "DeleteDownload | user=%s download=%s plan=%s",
            request.user_id, request.download_id, request.plan
        )

        if not is_plan_allowed(request.plan):
            return download_pb2.DeleteDownloadResponse(
                success=False,
                message=get_blocked_message(request.plan)
            )

        deleted = self.repo.soft_delete_download(
            request.download_id, request.user_id
        )

        if not deleted:
            return download_pb2.DeleteDownloadResponse(
                success=False,
                message="Descarga no encontrada o no pertenece a este usuario."
            )

        logger.info("Descarga eliminada | id=%s", request.download_id)

        return download_pb2.DeleteDownloadResponse(
            success=True,
            message="Descarga eliminada del almacenamiento local."
        )