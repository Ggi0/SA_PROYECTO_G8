-- ─────────────────────────────────────────────────────────
-- QuetxalTV — download-service
-- Inicialización de base de datos
-- ─────────────────────────────────────────────────────────

-- Tabla principal de descargas
CREATE TABLE IF NOT EXISTS downloads (
    download_id  UUID        PRIMARY KEY,
    user_id      VARCHAR(64) NOT NULL,
    profile_id   VARCHAR(64) NOT NULL,
    content_id   VARCHAR(64) NOT NULL,
    gcs_url      TEXT        NOT NULL,
    title        VARCHAR(255),
    thumbnail    TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    size_bytes   BIGINT,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);

-- Tabla de auditoría (requerido por el proyecto)
CREATE TABLE IF NOT EXISTS downloads_audit (
    audit_id     SERIAL      PRIMARY KEY,
    download_id  UUID        NOT NULL,
    user_id      VARCHAR(64) NOT NULL,
    action       VARCHAR(20) NOT NULL,   -- INSERT | UPDATE | DELETE
    old_status   VARCHAR(20),
    new_status   VARCHAR(20),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_downloads_user_profile
    ON downloads (user_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_downloads_content
    ON downloads (content_id);

CREATE INDEX IF NOT EXISTS idx_downloads_expires
    ON downloads (expires_at);

CREATE INDEX IF NOT EXISTS idx_downloads_status
    ON downloads (status);

-- ─────────────────────────────────────────────────────────
-- Trigger de auditoría (requerido por el proyecto)
-- Registra cada UPDATE en la tabla de auditoría
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_download()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO downloads_audit (
        download_id, user_id, action, old_status, new_status, changed_at
    ) VALUES (
        OLD.download_id,
        OLD.user_id,
        TG_OP,
        OLD.status,
        NEW.status,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_audit_downloads
    AFTER UPDATE ON downloads
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_download();

-- ─────────────────────────────────────────────────────────
-- Procedimiento almacenado: purgar descargas expiradas
-- Usado por el CronJob de mantenimiento
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE sp_purge_expired_downloads()
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE downloads
    SET status     = 'DELETED',
        updated_at = NOW()
    WHERE expires_at < NOW()
      AND status   != 'DELETED';

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE 'Purga completada: % descarga(s) expirada(s) eliminadas', v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- Vista: descargas activas por perfil
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_active_downloads AS
SELECT
    download_id,
    user_id,
    profile_id,
    content_id,
    title,
    thumbnail,
    status,
    size_bytes,
    expires_at,
    created_at,
    -- Días restantes antes de expiración
    EXTRACT(DAY FROM (expires_at - NOW())) AS days_remaining
FROM downloads
WHERE status    != 'DELETED'
  AND expires_at > NOW();

-- ─────────────────────────────────────────────────────────
-- Función: verificar si un contenido ya fue descargado
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_is_content_downloaded(
    p_user_id    VARCHAR,
    p_profile_id VARCHAR,
    p_content_id VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM downloads
        WHERE user_id    = p_user_id
          AND profile_id = p_profile_id
          AND content_id = p_content_id
          AND status     != 'DELETED'
          AND expires_at  > NOW()
    );
END;
$$ LANGUAGE plpgsql;
