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
