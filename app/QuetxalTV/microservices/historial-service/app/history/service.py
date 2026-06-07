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

    def guardar_progreso(self, request):
        content_type = request.content_type.upper().strip()

        if content_type not in ["MOVIE", "SERIES"]:
            raise ValueError("content_type debe ser MOVIE o SERIES")

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
            "content_type": content_type,
            "minute_reached": request.minute_reached,
            "total_duration_min": total_duration,
            "season_id": request.season_id,
            "episode_id": request.episode_id,
            "season_num": request.season_num,
            "episode_num": request.episode_num,
        }

        if content_type == "MOVIE":
            self.repository.guardar_progreso_pelicula(data)
            return "Progreso de película guardado correctamente"

        self.validar_uuid(request.season_id, "season_id")
        self.validar_uuid(request.episode_id, "episode_id")

        if request.season_num <= 0:
            raise ValueError("season_num debe ser mayor a 0")

        if request.episode_num <= 0:
            raise ValueError("episode_num debe ser mayor a 0")

        self.repository.guardar_progreso_serie(data)
        return "Progreso de serie guardado correctamente"

    def obtener_continuar_viendo(self, profile_id, limit):
        self.validar_uuid(profile_id, "profile_id")

        if limit <= 0:
            limit = 20

        return self.repository.obtener_continuar_viendo(profile_id, limit)

    def obtener_historial_por_perfil(self, profile_id):
        self.validar_uuid(profile_id, "profile_id")
        return self.repository.obtener_historial_por_perfil(profile_id)