-- Programación de estrenos para el catálogo
-- Ejecutar después de init.sql con: psql -f schedule.sql

SET search_path TO catalog;

-- Agrega la columna premiere_date a la tabla content.
-- NULL significa que el contenido es visible en cuanto is_published = TRUE.
-- Con fecha futura: publicado pero oculto hasta que llegue ese momento.
ALTER TABLE content
    ADD COLUMN IF NOT EXISTS premiere_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_content_premiere ON content(premiere_date)
    WHERE premiere_date IS NOT NULL;

-- Actualiza la vista v_catalog_card para respetar premiere_date.
-- Un contenido aparece solo si is_published=TRUE y
-- premiere_date es NULL o ya pasó.
-- DROP necesario porque CREATE OR REPLACE no permite cambiar el orden de columnas existentes.
DROP VIEW IF EXISTS v_catalog_card;
CREATE VIEW v_catalog_card AS
SELECT
    c.content_id, c.content_type, c.title, c.release_year, c.duration_min,
    c.rating_class, c.poster_url, c.published_at, c.premiere_date,
    COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres,
    fn_recommendation_percentage(c.content_id) AS recommendation_pct,
    fn_average_stars(c.content_id) AS avg_stars,
    (SELECT COUNT(*) FROM ratings r WHERE r.content_id = c.content_id) AS total_votes
FROM content c
LEFT JOIN content_genres cg ON c.content_id = cg.content_id
LEFT JOIN genres g           ON cg.genre_id  = g.genre_id
WHERE c.is_published = TRUE
  AND (c.premiere_date IS NULL OR c.premiere_date <= NOW())
GROUP BY c.content_id;

-- Actualiza fn_search_content para respetar premiere_date también en búsquedas.
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
        AND (c.premiere_date IS NULL OR c.premiere_date <= NOW())
        AND (p_type IS NULL OR c.content_type = p_type)
        AND to_tsvector('spanish', f_unaccent(c.title) || ' ' || COALESCE(f_unaccent(c.synopsis), ''))
            @@ plainto_tsquery('spanish', f_unaccent(p_query))
    ORDER BY relevance DESC
    LIMIT 50;
END;
$$;
