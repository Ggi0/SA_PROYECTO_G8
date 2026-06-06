CREATE OR REPLACE FUNCTION fn_subscription_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_action VARCHAR(50);
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        INSERT INTO subscription_audit_log (subscription_id, user_id, action, new_status, new_plan_id)
        VALUES (NEW.id, NEW.user_id, v_action, NEW.status, NEW.plan_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status OR OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
            IF NEW.status = 'cancelled' THEN
                v_action := 'cancelled';
            ELSIF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
                v_action := 'plan_changed';
            ELSIF NEW.status = 'expired' THEN
                v_action := 'expired';
            ELSE
                v_action := 'status_changed';
            END IF;

            INSERT INTO subscription_audit_log (subscription_id, user_id, action, old_status, new_status, old_plan_id, new_plan_id)
            VALUES (NEW.id, NEW.user_id, v_action, OLD.status, NEW.status, OLD.plan_id, NEW.plan_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_subscription_audit ON subscriptions;
CREATE TRIGGER tr_subscription_audit
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION fn_subscription_audit_trigger();
