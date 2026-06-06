CREATE OR REPLACE FUNCTION fn_can_access_content(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'ACTIVE'
      AND current_period_end > NOW();

    RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION fn_has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
BEGIN
    RETURN fn_can_access_content(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION fn_calculate_local_price(p_price_usd NUMERIC, p_exchange_rate NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
BEGIN
    RETURN ROUND(p_price_usd * p_exchange_rate, 2);
END;
$$;
