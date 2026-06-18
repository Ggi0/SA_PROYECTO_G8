-- Migración idempotente de auditoría (Fase 2).
--
-- Lleva la tabla audit_log y sus triggers al esquema transaccional genérico
-- SIN perder datos y SIN intervención manual. La ejecuta automáticamente el
-- pipeline de CD (Job de Kubernetes en GKE / servicio one-shot en Compose para
-- GCE). Es seguro re-ejecutarla cuantas veces sea necesario:
--   - Si la BD ya nació con el esquema nuevo (volumen fresco) -> no-op.
--   - Si la BD viene de Fase 1 (esquema viejo) -> la transforma preservando
--     los registros históricos.

SET search_path TO subscription;

-- 1) Asegurar las columnas del esquema genérico en audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS table_name VARCHAR(100);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS operation  VARCHAR(10);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS changed_by TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ;

-- 2) Backfill de filas heredadas de Fase 1 (solo si existían las columnas viejas)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'subscription' AND table_name = 'audit_log'
                 AND column_name = 'created_at') THEN
        UPDATE audit_log SET changed_at = created_at WHERE changed_at IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'subscription' AND table_name = 'audit_log'
                 AND column_name = 'event_type') THEN
        UPDATE audit_log
        SET table_name = COALESCE(table_name, 'subscriptions'),
            operation  = COALESCE(operation,
                            CASE WHEN event_type = 'SUBSCRIPTION_CREATED' THEN 'INSERT'
                                 ELSE 'UPDATE' END)
        WHERE table_name IS NULL OR operation IS NULL;
    END IF;
END $$;

-- 3) Defaults y relleno de cualquier fila restante
UPDATE audit_log SET changed_at = NOW()    WHERE changed_at IS NULL;
UPDATE audit_log SET changed_by = 'system' WHERE changed_by IS NULL;
UPDATE audit_log SET table_name = 'unknown' WHERE table_name IS NULL;
UPDATE audit_log SET operation  = 'UPDATE' WHERE operation  IS NULL;

ALTER TABLE audit_log ALTER COLUMN changed_at SET DEFAULT NOW();
ALTER TABLE audit_log ALTER COLUMN changed_by SET DEFAULT 'system';

-- 4) Restricciones NOT NULL (ya backfilleadas)
ALTER TABLE audit_log ALTER COLUMN table_name SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN operation  SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN changed_by SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN changed_at SET NOT NULL;

-- 5) CHECK de operación (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_log_operation_check'
          AND conrelid = 'subscription.audit_log'::regclass
    ) THEN
        ALTER TABLE audit_log
            ADD CONSTRAINT audit_log_operation_check
            CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'));
    END IF;
END $$;

-- 6) Eliminar columnas obsoletas de Fase 1. event_type era NOT NULL y bloquearía
--    los INSERT automáticos del nuevo trigger; el resto ya no se usan.
ALTER TABLE audit_log DROP COLUMN IF EXISTS event_type;
ALTER TABLE audit_log DROP COLUMN IF EXISTS user_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS created_at;

-- 7) Índices del esquema nuevo (idempotentes) y limpieza de los viejos
CREATE INDEX IF NOT EXISTS idx_audit_log_table      ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation  ON audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
DROP INDEX IF EXISTS idx_audit_log_user;
DROP INDEX IF EXISTS idx_audit_log_created;

-- 8) Reemplazar el trigger/función viejos por la auditoría transaccional genérica
DROP TRIGGER  IF EXISTS trg_audit_subscription_change ON subscriptions;
DROP FUNCTION IF EXISTS fn_audit_subscription_change();

CREATE OR REPLACE FUNCTION fn_subscription_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(current_setting('app.changed_by', true), 'system');
    IF v_changed_by = '' THEN
        v_changed_by := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', v_changed_by, NULL, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', v_changed_by, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'DELETE', v_changed_by, row_to_json(OLD)::JSONB, NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_plans ON plans;
CREATE TRIGGER trg_audit_plans
    AFTER INSERT OR UPDATE OR DELETE ON plans
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();

DROP TRIGGER IF EXISTS trg_audit_subscriptions ON subscriptions;
CREATE TRIGGER trg_audit_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();
