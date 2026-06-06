CREATE OR REPLACE FUNCTION fn_audit_subscription_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(user_id, subscription_id, event_type, old_data, new_data)
        VALUES (
            NEW.user_id,
            NEW.subscription_id,
            'SUBSCRIPTION_CREATED',
            NULL,
            jsonb_build_object('status', NEW.status, 'plan_id', NEW.plan_id)
        );
        RETURN NEW;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
        INSERT INTO audit_log(user_id, subscription_id, event_type, old_data, new_data)
        VALUES (
            NEW.user_id,
            NEW.subscription_id,
            CASE
                WHEN OLD.status = 'ACTIVE' AND NEW.status = 'CANCELLED' THEN 'SUBSCRIPTION_CANCELLED'
                WHEN OLD.plan_id != NEW.plan_id THEN 'PLAN_CHANGED'
                WHEN NEW.status = 'EXPIRED' THEN 'SUBSCRIPTION_EXPIRED'
                ELSE 'SUBSCRIPTION_UPDATED'
            END,
            jsonb_build_object('status', OLD.status, 'plan_id', OLD.plan_id),
            jsonb_build_object('status', NEW.status, 'plan_id', NEW.plan_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_subscription_change ON subscriptions;
CREATE TRIGGER trg_audit_subscription_change
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_subscription_change();
