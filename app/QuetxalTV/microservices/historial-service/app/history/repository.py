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
            sslmode=self.config.DB_SSLMODE,
            cursor_factory=RealDictCursor,
            options=f"-c search_path={self.config.DB_SCHEMA},public"
        )

    def guardar_progreso_pelicula(self, data):
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_movie_progress(
                %s::uuid,
                %s::uuid,
                %s::integer,
                %s::integer
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
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_episode_progress(
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::smallint,
                %s::smallint,
                %s::integer,
                %s::integer
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
        query = f"""
            SELECT *
            FROM {self.config.DB_SCHEMA}.fn_get_continue_watching(
                %s::uuid,
                %s::integer
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (profile_id, limit))
                return cursor.fetchall()

    def obtener_historial_por_perfil(self, profile_id):
        query = f"""
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
            FROM {self.config.DB_SCHEMA}.v_watch_history_summary
            WHERE profile_id = %s::uuid
            ORDER BY last_watched_at DESC;
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (profile_id,))
                return cursor.fetchall()

    def obtener_progreso_contenido(self, profile_id, content_id):
        query = f"""
            SELECT
                wp.progress_id,
                wp.profile_id,
                wp.content_id,
                wp.content_type,
                wp.minute_reached,
                wp.total_duration_min,
                wp.completion_pct,
                wp.is_completed,
                wp.last_watched_at,
                last_ep.episode_id AS last_episode_id,
                last_ep.season_num AS last_season_num,
                last_ep.episode_num AS last_episode_num,
                last_ep.minute_reached AS last_ep_minute
            FROM {self.config.DB_SCHEMA}.watch_progress wp
            LEFT JOIN LATERAL (
                SELECT
                    wpe.episode_id,
                    wpe.season_num,
                    wpe.episode_num,
                    wpe.minute_reached
                FROM {self.config.DB_SCHEMA}.watch_progress_episode wpe
                WHERE wpe.progress_id = wp.progress_id
                ORDER BY wpe.last_watched_at DESC
                LIMIT 1
            ) last_ep ON TRUE
            WHERE wp.profile_id = %s::uuid
              AND wp.content_id = %s::uuid
            LIMIT 1;
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (profile_id, content_id))
                return cursor.fetchone()