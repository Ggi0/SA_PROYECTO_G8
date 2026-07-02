-- Auditoría transaccional genérica del Subscription Service (Fase 2).
--
-- Cualquier INSERT/UPDATE/DELETE sobre plans, subscriptions o payments queda
-- registrado automáticamente en la tabla exclusiva audit_log con:
--   - table_name : tabla afectada
--   - operation  : INSERT | UPDATE | DELETE
--   - changed_by : usuario responsable (variable de sesión app.changed_by,
--                  seteada por el backend antes de cada operación de escritura)
--   - changed_at : timestamp exacto
--   - old_data   : estado anterior (snapshot completo de la fila)
--   - new_data   : estado nuevo (snapshot completo de la fila)
--
-- Requiere que la tabla audit_log exista (ver migrations/001_initial.sql).

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
