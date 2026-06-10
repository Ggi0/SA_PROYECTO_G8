
-- Registra el progreso de visualización por perfil.
-- Maneja "Continuar viendo", minuto actual, episodio actual.
--
-- NOTA SOBRE IDs EXTERNOS:
--   profile_id --> Auth Service (sin FK real)
--   content_id, episode_id --> Catalog Service (sin FK real)
--   La validez de estos IDs la garantiza el JWT y la lógica de la aplicación.
--   Cuando el frontend pide "continuar viendo", el Playback Service devuelve
--   los IDs y el API Gateway enriquece la respuesta llamando al Catalog Service
--   para obtener títulos, posters, etc.


DROP SCHEMA IF EXISTS playback CASCADE;
CREATE SCHEMA playback;
SET search_path TO playback;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


--                                                  TABLAS
-- TABLA: watch_progress
-- Registro central de progreso. Un perfil + contenido = un registro único.
-- Para películas: se guarda minute_reached en el contenido directamente.
-- Para series: se complementa con watch_progress_episode.

CREATE TABLE watch_progress (
    progress_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- IDs externos (sin FK, vienen del Auth y Catalog Service)
    profile_id      UUID NOT NULL,
    content_id      UUID NOT NULL,       -- ID de la película o serie en catalog_db
    content_type    VARCHAR(10) NOT NULL CHECK (content_type IN ('MOVIE', 'SERIES')),
    -- Para películas: minuto donde se quedó
    minute_reached  INT NOT NULL DEFAULT 0 CHECK (minute_reached >= 0),
    -- Duración total del contenido (guardada aquí para calcular % sin llamar al catálogo)
    total_duration_min INT,
    -- Porcentaje de completado: calculado por trigger
    completion_pct  NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_duration_min IS NOT NULL AND total_duration_min > 0
            THEN ROUND((minute_reached::NUMERIC / total_duration_min) * 100, 2)
            ELSE 0
        END
    ) STORED,
    -- Si completion_pct >= 90, lo marcamos como visto
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Última vez que se actualizó (para ordenar "continuar viendo" por recencia)
    last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un perfil solo tiene un registro por contenido (se hace upsert)
    UNIQUE(profile_id, content_id)
);


-- TABLA: watch_progress_episode
-- Detalle del progreso a nivel episodio para series.
-- Relación: watch_progress (la serie) --> watch_progress_episode (episodios vistos)

CREATE TABLE watch_progress_episode (
    ep_progress_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id     UUID NOT NULL REFERENCES watch_progress(progress_id) ON DELETE CASCADE,
    -- IDs del Catalog Service
    season_id       UUID NOT NULL,
    episode_id      UUID NOT NULL,
    season_num      SMALLINT NOT NULL,
    episode_num     SMALLINT NOT NULL,
    minute_reached  INT NOT NULL DEFAULT 0 CHECK (minute_reached >= 0),
    total_duration_min INT,
    completion_pct  NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_duration_min IS NOT NULL AND total_duration_min > 0
            THEN ROUND((minute_reached::NUMERIC / total_duration_min) * 100, 2)
            ELSE 0
        END
    ) STORED,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un registro por episodio por perfil (combinado con progress_id que ya filtra perfil+serie)
    UNIQUE(progress_id, episode_id)
);


--                                  ÍNDICES

-- El caso de uso más frecuente: "dame el historial reciente del perfil tal"
CREATE INDEX idx_watch_progress_profile     ON watch_progress(profile_id, last_watched_at DESC);
CREATE INDEX idx_watch_progress_content     ON watch_progress(content_id);
CREATE INDEX idx_watch_progress_incomplete  ON watch_progress(profile_id)
    WHERE is_completed = FALSE;  -- Índice parcial para "continuar viendo"
CREATE INDEX idx_episode_progress_parent    ON watch_progress_episode(progress_id);
CREATE INDEX idx_episode_progress_episode   ON watch_progress_episode(episode_id);


--                                                  FUNCIONES



-- FUNCIÓN: fn_get_last_episode(p_progress_id UUID)
-- Retorna el último episodio visto de una serie.
-- Usado para "continuar viendo" --> saber exactamente en qué episodio seguir.
CREATE OR REPLACE FUNCTION fn_get_last_episode(p_progress_id UUID)
RETURNS TABLE (
    episode_id     UUID,
    season_num     SMALLINT,
    episode_num    SMALLINT,
    minute_reached INT,
    completion_pct NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        wpe.episode_id,
        wpe.season_num,
        wpe.episode_num,
        wpe.minute_reached,
        wpe.completion_pct
    FROM watch_progress_episode wpe
    WHERE wpe.progress_id = p_progress_id
    ORDER BY wpe.last_watched_at DESC
    LIMIT 1;
END;
$$;


-- FUNCIÓN: fn_get_continue_watching(p_profile_id UUID, p_limit INT)
-- Retorna el historial "continuar viendo" del perfil:
--   - Contenido no completado
--   - Ordenado por más reciente
-- El API Gateway usa los content_id retornados para enriquecer con datos
-- del Catalog Service (título, poster, etc.)
CREATE OR REPLACE FUNCTION fn_get_continue_watching(
    p_profile_id UUID,
    p_limit      INT DEFAULT 20
)
RETURNS TABLE (
    progress_id    UUID,
    content_id     UUID,
    content_type   VARCHAR,
    minute_reached INT,
    completion_pct NUMERIC,
    last_watched_at TIMESTAMPTZ,
    -- Para series: info del último episodio
    last_episode_id  UUID,
    last_season_num  SMALLINT,
    last_episode_num SMALLINT,
    last_ep_minute   INT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        wp.progress_id,
        wp.content_id,
        wp.content_type,
        wp.minute_reached,
        wp.completion_pct,
        wp.last_watched_at,
        -- Subconsulta para el último episodio (solo series)
        (SELECT wpe.episode_id FROM watch_progress_episode wpe
         WHERE wpe.progress_id = wp.progress_id
         ORDER BY wpe.last_watched_at DESC LIMIT 1),
        (SELECT wpe.season_num FROM watch_progress_episode wpe
         WHERE wpe.progress_id = wp.progress_id
         ORDER BY wpe.last_watched_at DESC LIMIT 1),
        (SELECT wpe.episode_num FROM watch_progress_episode wpe
         WHERE wpe.progress_id = wp.progress_id
         ORDER BY wpe.last_watched_at DESC LIMIT 1),
        (SELECT wpe.minute_reached FROM watch_progress_episode wpe
         WHERE wpe.progress_id = wp.progress_id
         ORDER BY wpe.last_watched_at DESC LIMIT 1)
    FROM watch_progress wp
    WHERE wp.profile_id = p_profile_id
      AND wp.is_completed = FALSE
    ORDER BY wp.last_watched_at DESC
    LIMIT p_limit;
END;
$$;


--                                                  TRIGGERS
-- TRIGGER: trg_auto_mark_completed
-- TABLA:   watch_progress | EVENTO: BEFORE INSERT OR UPDATE
-- Si el porcentaje de completado supera el 90%, marca automáticamente
-- is_completed = TRUE. También actualiza last_watched_at.

CREATE OR REPLACE FUNCTION fn_auto_mark_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Actualizar timestamp
    NEW.last_watched_at = NOW();

    -- Marcar como completado si vio más del 90%
    IF NEW.total_duration_min IS NOT NULL
       AND NEW.total_duration_min > 0
       AND NEW.minute_reached >= (NEW.total_duration_min * 0.9) THEN
        NEW.is_completed = TRUE;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_mark_completed_movie
    BEFORE INSERT OR UPDATE ON watch_progress
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_mark_completed();

-- Mismo trigger para episodios
CREATE OR REPLACE FUNCTION fn_auto_mark_ep_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.last_watched_at = NOW();

    IF NEW.total_duration_min IS NOT NULL
       AND NEW.total_duration_min > 0
       AND NEW.minute_reached >= (NEW.total_duration_min * 0.9) THEN
        NEW.is_completed = TRUE;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_mark_ep_completed
    BEFORE INSERT OR UPDATE ON watch_progress_episode
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_mark_ep_completed();


-- TRIGGER: trg_sync_series_progress
-- TABLA:   watch_progress_episode | EVENTO: AFTER INSERT OR UPDATE
-- Cuando se actualiza un episodio, sincroniza el minute_reached del registro
-- padre (la serie en watch_progress) con el minuto del episodio actual.
-- Esto mantiene watch_progress como la "fuente de verdad" del progreso global.

CREATE OR REPLACE FUNCTION fn_sync_series_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE watch_progress
    SET
        minute_reached  = NEW.minute_reached,
        last_watched_at = NOW()
    WHERE progress_id = NEW.progress_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_series_progress
    AFTER INSERT OR UPDATE ON watch_progress_episode
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_series_progress();


--                                          PROCEDIMIENTOS ALMACENADOS

-- PROCEDIMIENTO: sp_update_movie_progress
-- Actualiza (o crea) el progreso de una película.
-- Upsert: si ya existe el registro, actualiza el minuto.

CREATE OR REPLACE PROCEDURE sp_update_movie_progress(
    p_profile_id       UUID,
    p_content_id       UUID,
    p_minute_reached   INT,
    p_total_duration   INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO watch_progress(
        profile_id, content_id, content_type,
        minute_reached, total_duration_min
    )
    VALUES (
        p_profile_id, p_content_id, 'MOVIE',
        p_minute_reached, p_total_duration
    )
    ON CONFLICT (profile_id, content_id)
    DO UPDATE SET
        minute_reached     = EXCLUDED.minute_reached,
        total_duration_min = COALESCE(EXCLUDED.total_duration_min, watch_progress.total_duration_min);
    -- El trigger trg_auto_mark_completed maneja is_completed y last_watched_at
END;
$$;


-- PROCEDIMIENTO: sp_update_episode_progress
-- Actualiza el progreso de un episodio específico de una serie.
-- Crea o actualiza el registro padre (la serie) y el episodio.

CREATE OR REPLACE PROCEDURE sp_update_episode_progress(
    p_profile_id       UUID,
    p_content_id       UUID,   -- ID de la serie
    p_season_id        UUID,
    p_episode_id       UUID,
    p_season_num       SMALLINT,
    p_episode_num      SMALLINT,
    p_minute_reached   INT,
    p_total_duration   INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- 1. Upsert del registro padre (la serie)
    INSERT INTO watch_progress(profile_id, content_id, content_type, minute_reached)
    VALUES (p_profile_id, p_content_id, 'SERIES', p_minute_reached)
    ON CONFLICT (profile_id, content_id) DO UPDATE
        SET minute_reached = EXCLUDED.minute_reached
    RETURNING progress_id INTO v_progress_id;

    -- 2. Upsert del episodio
    INSERT INTO watch_progress_episode(
        progress_id, season_id, episode_id,
        season_num, episode_num,
        minute_reached, total_duration_min
    )
    VALUES (
        v_progress_id, p_season_id, p_episode_id,
        p_season_num, p_episode_num,
        p_minute_reached, p_total_duration
    )
    ON CONFLICT (progress_id, episode_id)
    DO UPDATE SET
        minute_reached     = EXCLUDED.minute_reached,
        total_duration_min = COALESCE(EXCLUDED.total_duration_min, watch_progress_episode.total_duration_min);
    -- El trigger trg_sync_series_progress sincroniza el padre automáticamente
END;
$$;


--                                          VISTAS

-- VISTA: v_watch_history_summary
-- Resumen del historial de un perfil con el estado de cada contenido.
-- El servicio devuelve los content_id y el Gateway enriquece con el Catalog.

CREATE OR REPLACE VIEW v_watch_history_summary AS
SELECT
    wp.profile_id,
    wp.content_id,
    wp.content_type,
    wp.minute_reached,
    wp.total_duration_min,
    wp.completion_pct,
    wp.is_completed,
    wp.last_watched_at,
    -- Para series: datos del último episodio (subconsulta)
    CASE WHEN wp.content_type = 'SERIES' THEN
        (SELECT jsonb_build_object(
            'episode_id',  wpe.episode_id,
            'season_num',  wpe.season_num,
            'episode_num', wpe.episode_num,
            'minute',      wpe.minute_reached
        )
        FROM watch_progress_episode wpe
        WHERE wpe.progress_id = wp.progress_id
        ORDER BY wpe.last_watched_at DESC LIMIT 1)
    END AS last_episode_info
FROM watch_progress wp
ORDER BY wp.last_watched_at DESC;

