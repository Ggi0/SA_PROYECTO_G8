from uuid import UUID

from app.history.repository import HistorialRepository


class HistorialAppService:
    def __init__(self):
        self.repository = HistorialRepository()

    def validar_uuid(self, valor, nombre_campo):
        try:
            UUID(valor)
        except ValueError:
            raise ValueError(f"{nombre_campo} debe ser un UUID válido")

    def update_movie_progress(self, request):
        self.validar_uuid(request.profile_id, "profile_id")
        self.validar_uuid(request.content_id, "content_id")

        if request.minute_reached < 0:
            raise ValueError("minute_reached no puede ser negativo")

        total_duration = request.total_duration_min
        if total_duration <= 0:
            total_duration = None

        data = {
            "profile_id": request.profile_id,
            "content_id": request.content_id,
            "minute_reached": request.minute_reached,
            "total_duration_min": total_duration,
        }

        self.repository.guardar_progreso_pelicula(data)
        return "Progreso de película guardado correctamente"

    def update_episode_progress(self, request):
        self.validar_uuid(request.profile_id, "profile_id")
        self.validar_uuid(request.content_id, "content_id")
        self.validar_uuid(request.season_id, "season_id")
        self.validar_uuid(request.episode_id, "episode_id")

        if request.season_num <= 0:
            raise ValueError("season_num debe ser mayor a 0")

        if request.episode_num <= 0:
            raise ValueError("episode_num debe ser mayor a 0")

        if request.minute_reached < 0:
            raise ValueError("minute_reached no puede ser negativo")

        total_duration = request.total_duration_min
        if total_duration <= 0:
            total_duration = None

        data = {
            "profile_id": request.profile_id,
            "content_id": request.content_id,
            "season_id": request.season_id,
            "episode_id": request.episode_id,
            "season_num": request.season_num,
            "episode_num": request.episode_num,
            "minute_reached": request.minute_reached,
            "total_duration_min": total_duration,
        }

        self.repository.guardar_progreso_serie(data)
        return "Progreso de serie guardado correctamente"

    def get_continue_watching(self, profile_id, limit):
        self.validar_uuid(profile_id, "profile_id")

        if limit <= 0:
            limit = 20

        return self.repository.obtener_continuar_viendo(profile_id, limit)

    def get_content_progress(self, profile_id, content_id):
        self.validar_uuid(profile_id, "profile_id")
        self.validar_uuid(content_id, "content_id")

        return self.repository.obtener_progreso_contenido(profile_id, content_id)
    
    def get_history_audit_logs(self, table_name="", action="", limit=100, offset=0):
            table_filter = table_name.strip() if table_name else None
            action_filter = action.strip().upper() if action else None

            tablas_permitidas = {
            "watch_progress",
            "watch_progress_episode"
        }

            acciones_permitidas = {
            "INSERT",
            "UPDATE"
        }

            if table_filter and table_filter not in tablas_permitidas:
                raise ValueError(
                "table_name debe ser watch_progress o watch_progress_episode"
            )

            if action_filter and action_filter not in acciones_permitidas:
                raise ValueError(
                "action debe ser INSERT o UPDATE"
            )

            if limit <= 0:
                limit = 100

            if limit > 500:
                limit = 500

            if offset < 0:
                offset = 0

            return self.repository.obtener_logs_auditoria(
            table_filter,
            action_filter,
            limit,
            offset
        )