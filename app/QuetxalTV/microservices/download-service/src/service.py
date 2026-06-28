import logging
import uuid
import os
from datetime import datetime, timedelta

import download_pb2
import download_pb2_grpc
from repository import DownloadRepository

logger = logging.getLogger("download-service.service")

# ─────────────────────────────────────────────
# Regla de negocio
# Solo Plan ESTÁNDAR puede descargar.
# Plan Básico y Premium → bloqueados.
# ─────────────────────────────────────────────

# DESPUÉS
ALLOWED_PLAN = download_pb2.PLAN_PREMIUM

BLOCKED_MESSAGES = {
    download_pb2.PLAN_BASIC: (
        "El Plan Básico no incluye descarga de contenido. "
        "Actualiza al Plan Premium para ver contenido sin conexión."
    ),
    download_pb2.PLAN_STANDARD: (
        "El Plan Estándar no incluye descarga de contenido. "
        "Actualiza al Plan Premium para ver contenido sin conexión."
    ),
    download_pb2.PLAN_PREMIUM: (
        "El Plan Premium incluye descarga de contenido. "
        "Disfruta de tu contenido favorito sin conexión."
    )
}

DOWNLOAD_EXPIRY_DAYS = int(os.getenv("DOWNLOAD_EXPIRY_DAYS", "30"))
GCS_BUCKET = os.getenv("GCS_BUCKET", "quetxaltv-downloads")


def is_plan_allowed(plan: int) -> bool:
    return plan == ALLOWED_PLAN


def get_blocked_message(plan: int) -> str:
    return BLOCKED_MESSAGES.get(plan, "Plan de suscripción no válido.")


class DownloadService(download_pb2_grpc.DownloadServiceServicer):

    def __init__(self):
        self.repo = DownloadRepository()

    # ── Iniciar descarga ────────────────────────────────

    def InitiateDownload(self, request, context):
        logger.info(
            "InitiateDownload | user=%s profile=%s content=%s plan=%s",
            request.user_id, request.profile_id, request.content_id, request.plan
        )

        # Validar plan
        if not is_plan_allowed(request.plan):
            msg = get_blocked_message(request.plan)
            logger.warning("Bloqueado | user=%s plan=%s", request.user_id, request.plan)
            return download_pb2.InitiateDownloadResponse(
                allowed=False,
                message=msg
            )

        # Verificar si ya existe una descarga activa del mismo contenido
        existing = self.repo.find_active_download(
            request.user_id, request.profile_id, request.content_id
        )
        if existing:
            logger.info("Descarga ya existe | id=%s", existing["download_id"])
            return download_pb2.InitiateDownloadResponse(
                allowed=True,
                download_id=existing["download_id"],
                message="Ya tienes este contenido descargado.",
                gcs_url=existing["gcs_url"],
                expires_at=int(existing["expires_at"].timestamp())
            )

        # Crear nueva descarga
        download_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=DOWNLOAD_EXPIRY_DAYS)
        gcs_url = (
            f"https://storage.googleapis.com/{GCS_BUCKET}"
            f"/{request.user_id}/{request.content_id}.enc"
        )

        self.repo.create_download(
            download_id=download_id,
            user_id=request.user_id,
            profile_id=request.profile_id,
            content_id=request.content_id,
            gcs_url=gcs_url,
            expires_at=expires_at
        )

        logger.info("Descarga creada | id=%s expires=%s", download_id, expires_at)

        return download_pb2.InitiateDownloadResponse(
            allowed=True,
            download_id=download_id,
            message=f"Descarga iniciada. Disponible sin conexión por {DOWNLOAD_EXPIRY_DAYS} días.",
            gcs_url=gcs_url,
            expires_at=int(expires_at.timestamp())
        )

    # ── Listar descargas ────────────────────────────────

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
                status=r["status"],
                created_at=int(r["created_at"].timestamp()),
                expires_at=int(r["expires_at"].timestamp()),
                size_bytes=r["size_bytes"] or 0
            )
            for r in records
        ]

        return download_pb2.ListDownloadsResponse(
            allowed=True,
            message=f"{len(items)} descarga(s) encontrada(s).",
            downloads=items
        )

    # ── Eliminar descarga ───────────────────────────────

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
