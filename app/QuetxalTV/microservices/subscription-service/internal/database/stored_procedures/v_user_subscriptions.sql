CREATE OR REPLACE VIEW v_user_subscriptions AS
SELECT
    s.subscription_id,
    s.user_id,
    s.plan_id,
    p.name AS plan_name,
    p.price_usd,
    s.status,
    s.current_period_start AS start_date,
    s.current_period_end AS renewal_date,
    GREATEST(0, EXTRACT(DAY FROM (s.current_period_end - NOW()))::INT) AS days_remaining,
    p.max_profiles,
    p.max_streams,
    p.video_quality
FROM subscriptions s
JOIN plans p ON s.plan_id = p.plan_id;
