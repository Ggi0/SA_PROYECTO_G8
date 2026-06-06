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
