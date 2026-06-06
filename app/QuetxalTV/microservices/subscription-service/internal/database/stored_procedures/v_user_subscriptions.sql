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
