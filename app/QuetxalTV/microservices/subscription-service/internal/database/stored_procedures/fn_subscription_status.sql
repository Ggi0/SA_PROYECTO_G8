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
    SELECT price_usd INTO v_plan_price_usd FROM plans WHERE id = p_plan_id AND is_active = true;

    IF v_plan_price_usd IS NULL THEN
        p_result_status := 'ERROR';
        p_error_message := 'Plan no encontrado o inactivo';
        RETURN NEXT;
        RETURN;
    END IF;

    v_local_price := fn_calculate_local_price(v_plan_price_usd, p_exchange_rate);

    SELECT id INTO v_existing_sub_id FROM subscriptions WHERE user_id = p_user_id AND status = 'active' FOR UPDATE;

    IF v_existing_sub_id IS NOT NULL THEN
        UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = 'Cambio de plan', updated_at = NOW()
        WHERE id = v_existing_sub_id;
    END IF;

    INSERT INTO subscriptions (user_id, plan_id, status, start_date, renewal_date)
    VALUES (p_user_id, p_plan_id, 'active', NOW(), NOW() + INTERVAL '30 days')
    RETURNING id INTO p_subscription_id;

    v_transaction_ref := 'TXN-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 16));

    INSERT INTO payments (subscription_id, user_id, plan_id, amount_usd, amount_local, currency, exchange_rate, status, payment_method, transaction_ref)
    VALUES (p_subscription_id, p_user_id, p_plan_id, v_plan_price_usd, v_local_price, COALESCE(NULLIF(UPPER(p_currency), ''), 'USD'), p_exchange_rate, 'completed', p_payment_method, v_transaction_ref)
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
