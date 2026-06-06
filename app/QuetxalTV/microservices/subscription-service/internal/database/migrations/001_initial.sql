CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
    max_profiles INT NOT NULL DEFAULT 1 CHECK (max_profiles > 0),
    max_streams INT NOT NULL DEFAULT 1 CHECK (max_streams > 0),
    video_quality VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    renewal_date TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_one_active_per_user ON subscriptions(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES plans(id),
    amount_usd DECIMAL(10, 2) NOT NULL CHECK (amount_usd >= 0),
    amount_local DECIMAL(10, 2) NOT NULL CHECK (amount_local >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(12, 6) NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);

CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id BIGSERIAL PRIMARY KEY,
    subscription_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_plan_id UUID,
    new_plan_id UUID,
    performed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, description, price_usd, max_profiles, max_streams, video_quality) VALUES
    ('Basic', 'Disfruta contenido en SD con un perfil.', 5.99, 1, 1, 'SD'),
    ('Standard', 'Hasta 2 perfiles y calidad Full HD.', 9.99, 2, 2, 'Full HD'),
    ('Premium', 'Hasta 5 perfiles, 4K y descargas ilimitadas.', 15.99, 5, 4, '4K')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price_usd = EXCLUDED.price_usd,
    max_profiles = EXCLUDED.max_profiles,
    max_streams = EXCLUDED.max_streams,
    video_quality = EXCLUDED.video_quality,
    is_active = true,
    updated_at = NOW();

CREATE OR REPLACE VIEW v_plans_overview AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price_usd,
    p.max_profiles,
    p.max_streams,
    p.video_quality,
    p.is_active,
    COUNT(s.id) AS active_subscribers,
    p.created_at
FROM plans p
LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'active'
WHERE p.is_active = true
GROUP BY p.id
ORDER BY p.price_usd ASC;

CREATE OR REPLACE VIEW v_user_subscriptions AS
SELECT
    s.id AS subscription_id,
    s.user_id,
    s.status,
    s.start_date,
    s.end_date,
    s.renewal_date,
    s.cancelled_at,
    s.cancellation_reason,
    GREATEST(0, EXTRACT(DAY FROM (s.renewal_date - NOW()))::INT) AS days_remaining,
    p.id AS plan_id,
    p.name AS plan_name,
    p.description AS plan_description,
    p.price_usd,
    p.max_profiles,
    p.max_streams,
    p.video_quality
FROM subscriptions s
INNER JOIN plans p ON s.plan_id = p.id;

CREATE OR REPLACE FUNCTION fn_has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND renewal_date > NOW();

    RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION fn_calculate_local_price(p_price_usd DECIMAL, p_exchange_rate DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql AS $$
BEGIN
    RETURN ROUND(p_price_usd * p_exchange_rate, 2);
END;
$$;

CREATE OR REPLACE FUNCTION fn_process_subscription(
    p_user_id UUID,
    p_plan_id UUID,
    p_currency VARCHAR,
    p_exchange_rate DECIMAL,
    p_payment_method VARCHAR
)
RETURNS TABLE(p_subscription_id UUID, p_payment_id UUID, p_result_status VARCHAR, p_error_message VARCHAR)
LANGUAGE plpgsql AS $$
DECLARE
    v_plan_price_usd DECIMAL;
    v_local_price DECIMAL;
    v_existing_sub_id UUID;
    v_transaction_ref VARCHAR;
BEGIN
    SELECT price_usd INTO v_plan_price_usd
    FROM plans
    WHERE id = p_plan_id AND is_active = true;

    IF v_plan_price_usd IS NULL THEN
        p_subscription_id := NULL;
        p_payment_id := NULL;
        p_result_status := 'ERROR';
        p_error_message := 'Plan no encontrado o inactivo';
        RETURN NEXT;
        RETURN;
    END IF;

    v_local_price := fn_calculate_local_price(v_plan_price_usd, p_exchange_rate);

    SELECT id INTO v_existing_sub_id
    FROM subscriptions
    WHERE user_id = p_user_id AND status = 'active'
    FOR UPDATE;

    IF v_existing_sub_id IS NOT NULL THEN
        UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = 'Cambio de plan',
            updated_at = NOW()
        WHERE id = v_existing_sub_id;
    END IF;

    INSERT INTO subscriptions (user_id, plan_id, status, start_date, renewal_date)
    VALUES (p_user_id, p_plan_id, 'active', NOW(), NOW() + INTERVAL '30 days')
    RETURNING id INTO p_subscription_id;

    v_transaction_ref := 'TXN-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 16));

    INSERT INTO payments (
        subscription_id,
        user_id,
        plan_id,
        amount_usd,
        amount_local,
        currency,
        exchange_rate,
        status,
        payment_method,
        transaction_ref
    ) VALUES (
        p_subscription_id,
        p_user_id,
        p_plan_id,
        v_plan_price_usd,
        v_local_price,
        COALESCE(NULLIF(UPPER(p_currency), ''), 'USD'),
        p_exchange_rate,
        'completed',
        p_payment_method,
        v_transaction_ref
    )
    RETURNING id INTO p_payment_id;

    p_result_status := 'SUCCESS';
    p_error_message := '';
    RETURN NEXT;

EXCEPTION WHEN OTHERS THEN
    p_subscription_id := NULL;
    p_payment_id := NULL;
    p_result_status := 'ERROR';
    p_error_message := SQLERRM;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_process_subscription(
    IN p_user_id UUID,
    IN p_plan_id UUID,
    IN p_currency VARCHAR,
    IN p_exchange_rate DECIMAL,
    IN p_payment_method VARCHAR,
    OUT p_subscription_id UUID,
    OUT p_payment_id UUID,
    OUT p_result_status VARCHAR,
    OUT p_error_message VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    SELECT r.p_subscription_id, r.p_payment_id, r.p_result_status, r.p_error_message
    INTO p_subscription_id, p_payment_id, p_result_status, p_error_message
    FROM fn_process_subscription(p_user_id, p_plan_id, p_currency, p_exchange_rate, p_payment_method) r;
END;
$$;

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

            INSERT INTO subscription_audit_log (
                subscription_id,
                user_id,
                action,
                old_status,
                new_status,
                old_plan_id,
                new_plan_id
            ) VALUES (
                NEW.id,
                NEW.user_id,
                v_action,
                OLD.status,
                NEW.status,
                OLD.plan_id,
                NEW.plan_id
            );
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
