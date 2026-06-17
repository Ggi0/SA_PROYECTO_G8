import json
import grpc

from app.history.service import HistorialAppService
from app.proto import historial_pb2
from app.proto import historial_pb2_grpc


class HistorialHandler(historial_pb2_grpc.HistorialServiceServicer):
    def __init__(self):
        self.service = HistorialAppService()

    def UpdateMovieProgress(self, request, context):
        try:
            mensaje = self.service.update_movie_progress(request)

            return historial_pb2.ProgressResponse(
                success=True,
                message=mensaje
            )

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))

            return historial_pb2.ProgressResponse(
                success=False,
                message=str(error)
            )

        except Exception as error:
            print(f"ERROR AL GUARDAR PROGRESO DE PELÍCULA: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al guardar progreso de película")

            return historial_pb2.ProgressResponse(
                success=False,
                message="Error interno al guardar progreso de película"
            )

    def UpdateEpisodeProgress(self, request, context):
        try:
            mensaje = self.service.update_episode_progress(request)

            return historial_pb2.ProgressResponse(
                success=True,
                message=mensaje
            )

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))

            return historial_pb2.ProgressResponse(
                success=False,
                message=str(error)
            )

        except Exception as error:
            print(f"ERROR AL GUARDAR PROGRESO DE EPISODIO: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al guardar progreso de episodio")

            return historial_pb2.ProgressResponse(
                success=False,
                message="Error interno al guardar progreso de episodio"
            )

    def GetContinueWatching(self, request, context):
        try:
            registros = self.service.get_continue_watching(
                request.profile_id,
                request.limit
            )

            items = [
                self.mapear_progress_item(row, request.profile_id)
                for row in registros
            ]

            return historial_pb2.ContinueWatchingResponse(items=items)

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))
            return historial_pb2.ContinueWatchingResponse(items=[])

        except Exception as error:
            print(f"ERROR AL OBTENER CONTINUAR VIENDO: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al obtener continuar viendo")

            return historial_pb2.ContinueWatchingResponse(items=[])

    def GetContentProgress(self, request, context):
        try:
            row = self.service.get_content_progress(
                request.profile_id,
                request.content_id
            )

            if not row:
                return historial_pb2.ProgressResponse(
                    success=False,
                    message="No se encontró progreso para el contenido solicitado"
                )

            return historial_pb2.ProgressResponse(
                success=True,
                message="Progreso obtenido correctamente",
                progress=self.mapear_progress_item(row, request.profile_id)
            )

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))

            return historial_pb2.ProgressResponse(
                success=False,
                message=str(error)
            )

        except Exception as error:
            print(f"ERROR AL OBTENER PROGRESO DEL CONTENIDO: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al obtener progreso del contenido")

            return historial_pb2.ProgressResponse(
                success=False,
                message="Error interno al obtener progreso del contenido"
            )
        
    def GetHistoryAuditLogs(self, request, context):
        try:
            registros = self.service.get_history_audit_logs(
                request.table_name,
                request.action,
                request.limit,
                request.offset
            )

            items = [
                self.mapear_audit_item(row)
                for row in registros
            ]

            return historial_pb2.HistoryAuditLogsResponse(items=items)

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))

            return historial_pb2.HistoryAuditLogsResponse(items=[])

        except Exception as error:
            print(f"ERROR AL OBTENER LOGS DE AUDITORÍA DE HISTORIAL: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al obtener logs de auditoría de historial")

            return historial_pb2.HistoryAuditLogsResponse(items=[])

    def HealthLive(self, request, context):
        try:
            result = self.service.health_live()

            return historial_pb2.HealthCheckResponse(
                success=result["success"],
                status=result["status"],
                service=result["service"],
                message=result["message"]
            )

        except Exception as error:
            print(f"ERROR EN HEALTH LIVE DE HISTORIAL: {str(error)}")

            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno en HealthLive")

            return historial_pb2.HealthCheckResponse(
                success=False,
                status="ERROR",
                service="historial-service",
                message="Error interno en HealthLive"
            )

    def HealthReady(self, request, context):
        try:
            result = self.service.health_ready()

            if not result["success"]:
                context.set_code(grpc.StatusCode.UNAVAILABLE)
                context.set_details(result["message"])

            return historial_pb2.HealthCheckResponse(
                success=result["success"],
                status=result["status"],
                service=result["service"],
                message=result["message"]
            )

        except Exception as error:
            print(f"ERROR EN HEALTH READY DE HISTORIAL: {str(error)}")

            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details("Historial service no está listo")

            return historial_pb2.HealthCheckResponse(
                success=False,
                status="NOT_READY",
                service="historial-service",
                message="Historial service no está listo"
            )

    def convertir_json_a_string(self, value):
        if value is None:
            return ""

        if isinstance(value, str):
            return value

        return json.dumps(value, default=str, ensure_ascii=False)

    def mapear_audit_item(self, row):
        return historial_pb2.HistoryAuditLogItem(
            audit_id=str(row.get("audit_id") or ""),
            responsible_user_id=str(row.get("responsible_user_id") or ""),
            responsible_profile_id=str(row.get("responsible_profile_id") or ""),
            action=str(row.get("action") or ""),
            table_name=str(row.get("table_name") or ""),
            record_id=str(row.get("record_id") or ""),
            old_state=self.convertir_json_a_string(row.get("old_state")),
            new_state=self.convertir_json_a_string(row.get("new_state")),
            created_at=str(row.get("created_at") or "")
        )
        
    def mapear_progress_item(self, row, profile_id=None):
        return historial_pb2.ProgressItem(
            progress_id=str(row.get("progress_id") or ""),
            profile_id=str(row.get("profile_id") or profile_id or ""),
            content_id=str(row.get("content_id") or ""),
            content_type=str(row.get("content_type") or ""),
            minute_reached=int(row.get("minute_reached") or 0),
            total_duration_min=int(row.get("total_duration_min") or 0),
            completion_pct=float(row.get("completion_pct") or 0),
            is_completed=bool(row.get("is_completed") or False),
            last_watched_at=str(row.get("last_watched_at") or ""),
            last_episode_id=str(row.get("last_episode_id") or ""),
            last_season_num=int(row.get("last_season_num") or 0),
            last_episode_num=int(row.get("last_episode_num") or 0),
            last_ep_minute=int(row.get("last_ep_minute") or 0)
        )