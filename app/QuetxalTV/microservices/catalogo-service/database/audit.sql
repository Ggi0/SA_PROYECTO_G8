-- Auditoría transaccional para el catálogo
-- Ejecutar después de init.sql con: psql -f audit.sql

SET search_path TO catalog;

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS catalog_audit_log (
    id           BIGSERIAL    PRIMARY KEY,
    table_name   VARCHAR(100) NOT NULL,
    operation    VARCHAR(10)  NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by   TEXT         NOT NULL DEFAULT 'system',
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    old_data     JSONB,
    new_data     JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_table_name  ON catalog_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_operation   ON catalog_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at  ON catalog_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by  ON catalog_audit_log(changed_by);

-- Función genérica de auditoría
-- Lee app.changed_by de la sesión (lo setea el backend antes de cada write).
-- Si no está definido, cae a 'system'.
CREATE OR REPLACE FUNCTION fn_catalog_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(current_setting('app.changed_by', true), 'system');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO catalog_audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', v_changed_by, NULL, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO catalog_audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', v_changed_by, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO catalog_audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'DELETE', v_changed_by, row_to_json(OLD)::JSONB, NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Triggers en las tablas principales del catálogo
CREATE TRIGGER trg_audit_content
    AFTER INSERT OR UPDATE OR DELETE ON content
    FOR EACH ROW EXECUTE FUNCTION fn_catalog_audit();

CREATE TRIGGER trg_audit_genres
    AFTER INSERT OR UPDATE OR DELETE ON genres
    FOR EACH ROW EXECUTE FUNCTION fn_catalog_audit();

CREATE TRIGGER trg_audit_people
    AFTER INSERT OR UPDATE OR DELETE ON people
    FOR EACH ROW EXECUTE FUNCTION fn_catalog_audit();

CREATE TRIGGER trg_audit_content_people
    AFTER INSERT OR UPDATE OR DELETE ON content_people
    FOR EACH ROW EXECUTE FUNCTION fn_catalog_audit();
