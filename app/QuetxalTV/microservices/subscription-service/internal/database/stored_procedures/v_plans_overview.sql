CREATE OR REPLACE VIEW v_plans_overview AS
SELECT
    p.plan_id,
    p.name,
    p.slug,
    p.price_usd,
    p.max_profiles,
    p.max_streams,
    p.video_quality,
    p.features,
    p.is_active,
    COUNT(s.subscription_id) AS active_subscribers,
    p.created_at
FROM plans p
LEFT JOIN subscriptions s ON s.plan_id = p.plan_id AND s.status = 'ACTIVE'
WHERE p.is_active = TRUE
GROUP BY p.plan_id
ORDER BY p.price_usd ASC;
