import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import Config


class HistorialRepository:
    def __init__(self):
        self.config = Config()

    def get_connection(self):
        return psycopg2.connect(
            host=self.config.DB_HOST,
            port=self.config.DB_PORT,
            dbname=self.config.DB_NAME,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            cursor_factory=RealDictCursor
        )

    def guardar_progreso_pelicula(self, data):
        query = """
            CALL playback.sp_update_movie_progress(
                %s::uuid,
                %s::uuid,
                %s,
                %s
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def guardar_progreso_serie(self, data):
        query = """
            CALL playback.sp_update_episode_progress(
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s,
                %s,
                %s,
                %s
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["season_id"],
                    data["episode_id"],
                    data["season_num"],
                    data["episode_num"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def obtener_continuar_viendo(self, profile_id, limit=20):
        query = """
            SELECT *
            FROM playback.fn_get_continue_watching(%s::uuid, %s);
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (profile_id, limit))
                return cursor.fetchall()

    def obtener_historial_por_perfil(self, profile_id):
        query = """
            SELECT
                profile_id,
                content_id,
                content_type,
                minute_reached,
                total_duration_min,
                completion_pct,
                is_completed,
                last_watched_at,
                last_episode_info
            FROM playback.v_watch_history_summary
            WHERE profile_id = %s::uuid
            ORDER BY last_watched_at DESC;
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (profile_id,))
                return cursor.fetchall()