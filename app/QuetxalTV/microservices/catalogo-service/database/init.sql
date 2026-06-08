-- Schema del Catálogo Service
-- Versión corregida: schema se llama 'catalog' consistentemente

DROP SCHEMA IF EXISTS catalog CASCADE;
CREATE SCHEMA catalog;
SET search_path TO catalog;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- unaccent es STABLE, no IMMUTABLE, así que no puede usarse directamente en
-- índices. Este wrapper la marca como IMMUTABLE para habilitarlo en el GIN.
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT unaccent('unaccent', $1) $$;

-- TABLAS

CREATE TABLE genres (
    genre_id    SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE people (
    person_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   VARCHAR(255) NOT NULL,
    birth_date  DATE,
    nationality VARCHAR(100),
    bio         TEXT,
    photo_url   VARCHAR(500)
);

CREATE TABLE content (
    content_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type    VARCHAR(10) NOT NULL CHECK (content_type IN ('MOVIE', 'SERIES')),
    title           VARCHAR(500) NOT NULL,
    original_title  VARCHAR(500),
    synopsis        TEXT,
    release_year    SMALLINT,
    duration_min    SMALLINT,
    rating_class    VARCHAR(10),
    poster_url      VARCHAR(500),
    trailer_url     VARCHAR(500),
    video_ref       VARCHAR(500),
    video_source    VARCHAR(20) DEFAULT 'youtube',
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seasons (
    season_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id   UUID NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    season_num   SMALLINT NOT NULL,
    title        VARCHAR(255),
    release_year SMALLINT,
    CHECK (season_num > 0),
    UNIQUE(content_id, season_num)
);

CREATE TABLE episodes (
    episode_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id    UUID NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    episode_num  SMALLINT NOT NULL,
    title        VARCHAR(500) NOT NULL,
    synopsis     TEXT,
    duration_min SMALLINT,
    video_ref    VARCHAR(500),
    video_source VARCHAR(20) DEFAULT 'youtube',
    CHECK (episode_num > 0),
    UNIQUE(season_id, episode_num)
);

CREATE TABLE content_genres (
    content_id UUID NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    genre_id   INT  NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, genre_id)
);

CREATE TABLE content_people (
    content_id     UUID NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    person_id      UUID NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
    role_type      VARCHAR(50) NOT NULL,
    character_name VARCHAR(255),
    billing_order  SMALLINT,
    PRIMARY KEY (content_id, person_id, role_type)
);

CREATE TABLE ratings (
    rating_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    profile_id UUID NOT NULL,
    thumb      VARCHAR(10) CHECK (thumb IN ('UP', 'DOWN', NULL)),
    stars      SMALLINT CHECK (stars BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(content_id, profile_id)
);

-- ÍNDICES

CREATE INDEX idx_content_type      ON content(content_type);
CREATE INDEX idx_content_published ON content(is_published, published_at DESC);
CREATE INDEX idx_content_year      ON content(release_year);
CREATE INDEX idx_content_search    ON content USING GIN (
    to_tsvector('spanish', f_unaccent(title) || ' ' || COALESCE(f_unaccent(synopsis), ''))
);
CREATE INDEX idx_ratings_content   ON ratings(content_id);
CREATE INDEX idx_ratings_profile   ON ratings(profile_id);
CREATE INDEX idx_seasons_content   ON seasons(content_id);
CREATE INDEX idx_episodes_season   ON episodes(season_id);

-- FUNCIONES

CREATE OR REPLACE FUNCTION fn_recommendation_percentage(p_content_id UUID)
RETURNS NUMERIC(5,2) LANGUAGE plpgsql AS $$
DECLARE
    v_total INTEGER;
    v_up    INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE thumb = 'UP')
    INTO v_total, v_up
    FROM ratings
    WHERE content_id = p_content_id AND thumb IS NOT NULL;

    IF v_total = 0 THEN RETURN NULL; END IF;
    RETURN ROUND((v_up::NUMERIC / v_total) * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION fn_average_stars(p_content_id UUID)
RETURNS NUMERIC(3,2) LANGUAGE plpgsql AS $$
DECLARE v_avg NUMERIC;
BEGIN
    SELECT AVG(stars) INTO v_avg FROM ratings
    WHERE content_id = p_content_id AND stars IS NOT NULL;
    RETURN ROUND(v_avg, 2);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_content(
    p_query VARCHAR,
    p_type  VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    content_id   UUID,
    content_type VARCHAR,
    title        VARCHAR,
    release_year SMALLINT,
    poster_url   VARCHAR,
    relevance    REAL
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.content_id, c.content_type, c.title, c.release_year, c.poster_url,
        ts_rank(
            to_tsvector('spanish', f_unaccent(c.title) || ' ' || COALESCE(f_unaccent(c.synopsis), '')),
            plainto_tsquery('spanish', f_unaccent(p_query))
        ) AS relevance
    FROM content c
    WHERE
        c.is_published = TRUE
        AND (p_type IS NULL OR c.content_type = p_type)
        AND to_tsvector('spanish', f_unaccent(c.title) || ' ' || COALESCE(f_unaccent(c.synopsis), ''))
            @@ plainto_tsquery('spanish', f_unaccent(p_query))
    ORDER BY relevance DESC
    LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- TRIGGERS

CREATE OR REPLACE FUNCTION fn_set_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.is_published = FALSE AND NEW.is_published = TRUE THEN
        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_published_at
    BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION fn_set_published_at();

CREATE OR REPLACE FUNCTION fn_validate_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.thumb IS NULL AND NEW.stars IS NULL THEN
        RAISE EXCEPTION 'Debe proporcionar al menos una calificación (thumb o stars).';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rating
    BEFORE INSERT OR UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION fn_validate_rating();

CREATE TRIGGER trg_content_updated_at
    BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- PROCEDIMIENTOS ALMACENADOS

CREATE OR REPLACE PROCEDURE sp_upsert_rating(
    p_content_id UUID,
    p_profile_id UUID,
    p_thumb      VARCHAR DEFAULT NULL,
    p_stars      SMALLINT DEFAULT NULL
) LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO ratings(content_id, profile_id, thumb, stars)
    VALUES (p_content_id, p_profile_id, p_thumb, p_stars)
    ON CONFLICT (content_id, profile_id)
    DO UPDATE SET thumb = EXCLUDED.thumb, stars = EXCLUDED.stars, created_at = NOW();
END;
$$;

-- VISTAS

CREATE OR REPLACE VIEW v_catalog_card AS
SELECT
    c.content_id, c.content_type, c.title, c.release_year, c.duration_min,
    c.rating_class, c.poster_url, c.published_at,
    COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres,
    fn_recommendation_percentage(c.content_id) AS recommendation_pct,
    fn_average_stars(c.content_id) AS avg_stars,
    (SELECT COUNT(*) FROM ratings r WHERE r.content_id = c.content_id) AS total_votes
FROM content c
LEFT JOIN content_genres cg ON c.content_id = cg.content_id
LEFT JOIN genres g ON cg.genre_id = g.genre_id
WHERE c.is_published = TRUE
GROUP BY c.content_id;

CREATE OR REPLACE VIEW v_content_detail AS
SELECT
    c.content_id, c.content_type, c.title, c.original_title, c.synopsis,
    c.release_year, c.duration_min, c.rating_class, c.poster_url, c.trailer_url,
    c.video_ref, c.video_source,
    COALESCE(
        JSON_AGG(DISTINCT jsonb_build_object('genre_id', g.genre_id, 'name', g.name))
        FILTER (WHERE g.name IS NOT NULL), '[]'
    ) AS genres,
    COALESCE(
        JSON_AGG(DISTINCT jsonb_build_object(
            'person_id', p.person_id, 'full_name', p.full_name,
            'photo_url', p.photo_url, 'role_type', cp.role_type,
            'character_name', cp.character_name, 'billing_order', cp.billing_order
        )) FILTER (WHERE p.person_id IS NOT NULL), '[]'
    ) AS cast_and_crew,
    fn_recommendation_percentage(c.content_id) AS recommendation_pct,
    fn_average_stars(c.content_id) AS avg_stars
FROM content c
LEFT JOIN content_genres cg ON c.content_id = cg.content_id
LEFT JOIN genres g           ON cg.genre_id = g.genre_id
LEFT JOIN content_people cp  ON c.content_id = cp.content_id
LEFT JOIN people p           ON cp.person_id = p.person_id
GROUP BY c.content_id;

CREATE OR REPLACE VIEW v_series_structure AS
SELECT
    c.content_id, c.title AS series_title,
    s.season_id, s.season_num, s.title AS season_title,
    e.episode_id, e.episode_num, e.title AS episode_title,
    e.synopsis AS episode_synopsis, e.duration_min, e.video_ref, e.video_source
FROM content c
JOIN seasons s  ON c.content_id = s.content_id
JOIN episodes e ON s.season_id  = e.season_id
WHERE c.content_type = 'SERIES'
ORDER BY c.title, s.season_num, e.episode_num;

-- SEED de géneros
INSERT INTO genres (name, slug) VALUES
    ('Acción',     'accion'),
    ('Drama',      'drama'),
    ('Comedia',    'comedia'),
    ('Terror',     'terror'),
    ('Animación',  'animacion'),
    ('Documental', 'documental')
ON CONFLICT DO NOTHING;
