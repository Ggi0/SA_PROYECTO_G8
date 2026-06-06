CREATE OR REPLACE FUNCTION fn_process_subscription(
    p_user_id UUID,
    p_plan_id INT,
    p_display_currency VARCHAR,
    p_exchange_rate NUMERIC,
    p_payment_method VARCHAR
)
RETURNS TABLE(
    p_subscription_id UUID,
    p_payment_id UUID,
    p_result_status VARCHAR,
    p_error_message VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_plan_price NUMERIC(10,2);
    v_display_amount NUMERIC(10,2);
    v_gateway_ref VARCHAR;
BEGIN
    SELECT price_usd INTO v_plan_price
    FROM plans
    WHERE plan_id = p_plan_id AND is_active = TRUE;

    IF NOT FOUND THEN
        p_result_status := 'ERROR';
        p_error_message := 'Plan no encontrado o inactivo';
        RETURN NEXT;
        RETURN;
    END IF;

    v_display_amount := fn_calculate_local_price(v_plan_price, p_exchange_rate);
    v_gateway_ref := 'TXN-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 16));

    UPDATE subscriptions
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancel_at = current_period_end,
        auto_renew = FALSE
    WHERE user_id = p_user_id AND status = 'ACTIVE';

    CALL sp_create_subscription(
        p_user_id,
        p_plan_id,
        v_plan_price,
        COALESCE(NULLIF(UPPER(p_display_currency), ''), 'USD'),
        v_display_amount,
        v_gateway_ref,
        COALESCE(NULLIF(p_payment_method, ''), 'card'),
        p_subscription_id,
        p_payment_id
    );

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
