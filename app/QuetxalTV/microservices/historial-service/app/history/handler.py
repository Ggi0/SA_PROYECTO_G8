import grpc

from app.history.service import HistorialAppService
from app.proto import historial_pb2
from app.proto import historial_pb2_grpc


class HistorialHandler(historial_pb2_grpc.HistorialServiceServicer):
    def __init__(self):
        self.service = HistorialAppService()

    def GuardarProgreso(self, request, context):
        try:
            mensaje = self.service.guardar_progreso(request)

            return historial_pb2.GuardarProgresoResponse(
                success=True,
                message=mensaje
            )

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))

            return historial_pb2.GuardarProgresoResponse(
                success=False,
                message=str(error)
            )

        except Exception as error:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error interno al guardar el progreso")

            return historial_pb2.GuardarProgresoResponse(
                success=False,
                message=f"Error interno: {str(error)}"
            )

    def ObtenerContinuarViendo(self, request, context):
        try:
            registros = self.service.obtener_continuar_viendo(
                request.profile_id,
                request.limit
            )

            items = [self.mapear_continue_watching_item(row, request.profile_id) for row in registros]

            return historial_pb2.ContinuarViendoResponse(items=items)

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))
            return historial_pb2.ContinuarViendoResponse(items=[])

        except Exception as error:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error interno al obtener continuar viendo: {str(error)}")
            return historial_pb2.ContinuarViendoResponse(items=[])

    def ObtenerHistorialPorPerfil(self, request, context):
        try:
            registros = self.service.obtener_historial_por_perfil(request.profile_id)

            items = [self.mapear_historial_item(row) for row in registros]

            return historial_pb2.HistorialPorPerfilResponse(items=items)

        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(error))
            return historial_pb2.HistorialPorPerfilResponse(items=[])

        except Exception as error:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error interno al obtener historial: {str(error)}")
            return historial_pb2.HistorialPorPerfilResponse(items=[])

    def mapear_continue_watching_item(self, row, profile_id):
        return historial_pb2.ProgresoItem(
            progress_id=str(row.get("progress_id") or ""),
            profile_id=str(profile_id),
            content_id=str(row.get("content_id") or ""),
            content_type=str(row.get("content_type") or ""),
            minute_reached=int(row.get("minute_reached") or 0),
            total_duration_min=0,
            completion_pct=float(row.get("completion_pct") or 0),
            is_completed=False,
            last_watched_at=str(row.get("last_watched_at") or ""),
            last_episode_id=str(row.get("last_episode_id") or ""),
            last_season_num=int(row.get("last_season_num") or 0),
            last_episode_num=int(row.get("last_episode_num") or 0),
            last_ep_minute=int(row.get("last_ep_minute") or 0)
        )

    def mapear_historial_item(self, row):
        last_episode_info = row.get("last_episode_info") or {}

        return historial_pb2.ProgresoItem(
            progress_id="",
            profile_id=str(row.get("profile_id") or ""),
            content_id=str(row.get("content_id") or ""),
            content_type=str(row.get("content_type") or ""),
            minute_reached=int(row.get("minute_reached") or 0),
            total_duration_min=int(row.get("total_duration_min") or 0),
            completion_pct=float(row.get("completion_pct") or 0),
            is_completed=bool(row.get("is_completed") or False),
            last_watched_at=str(row.get("last_watched_at") or ""),
            last_episode_id=str(last_episode_info.get("episode_id") or ""),
            last_season_num=int(last_episode_info.get("season_num") or 0),
            last_episode_num=int(last_episode_info.get("episode_num") or 0),
            last_ep_minute=int(last_episode_info.get("minute") or 0)
        )