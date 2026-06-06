
--    Maneja planes, suscripciones activas, pagos e historial de compras. Se apoya en FX Service para conversión de monedas.

-- NOTA SOBRE IDs EXTERNOS:
--   user_id viene del Auth Service (validado por JWT, sin FK real).
--   Los precios base siempre se guardan en USD; la conversión a moneda local
--   la hace el FX Service en tiempo real y nunca se persiste aquí.


DROP SCHEMA IF EXISTS subscription CASCADE;
CREATE SCHEMA subscription;
SET search_path TO subscription;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


--                                                            TABLAS

-- TABLA: plans
-- Catálogo de planes disponibles. El precio base siempre en USD.
-- La conversión a moneda local la hace el FX Service al mostrar al usuario.
CREATE TABLE plans (
    plan_id         SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,  -- 'Básico', 'Estándar', 'Premium'
    slug            VARCHAR(50) NOT NULL UNIQUE,   -- 'basic', 'standard', 'premium'
    -- Precio mensual en USD (2 decimales)
    price_usd       NUMERIC(10,2) NOT NULL CHECK (price_usd >= 0),
    
    -- Límites del plan
    max_profiles    SMALLINT NOT NULL DEFAULT 1,
    max_streams     SMALLINT NOT NULL DEFAULT 1,   -- Streams simultáneos
    video_quality   VARCHAR(10) NOT NULL DEFAULT 'SD',  -- 'SD', 'HD', 'UHD'
    
    -- Descripción en texto libre (bullets de features para el frontend)
    features        JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: subscriptions
-- Estado actual de la suscripción de cada usuario.
-- Solo debe existir UNA suscripción activa por usuario a la vez.
-- El trigger trg_one_active_subscription valida esto.
CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- user_id del Auth Service, sin FK real
    user_id         UUID NOT NULL,
    plan_id         INT NOT NULL REFERENCES plans(plan_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE')),
    -- Período de facturación actual
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end   TIMESTAMPTZ NOT NULL,
    -- Si fue cancelada, ¿cuándo efectivamente termina el servicio?
    cancel_at            TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,
    -- Renovación automática
    auto_renew      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: payments
-- Historial de todos los cobros realizados.
-- Cada vez que se renueva o contrata un plan, se inserta un registro aquí.
CREATE TABLE payments (
    payment_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id),
    user_id         UUID NOT NULL,
    plan_id         INT NOT NULL REFERENCES plans(plan_id),
    -- Monto siempre en USD (lo que se cobró)
    amount_usd      NUMERIC(10,2) NOT NULL,
    -- Moneda en que el usuario vio el precio (informativo, del FX Service)
    display_currency VARCHAR(3),    -- 'GTQ', 'MXN', 'EUR'
    display_amount   NUMERIC(10,2), -- El equivalente que vio en pantalla
    status          VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    -- Referencia al proveedor de pagos externo (Stripe, PayPal, etc.)
    gateway_ref     VARCHAR(255),
    payment_method  VARCHAR(50),    -- 'card', 'paypal', 'bank_transfer'
    -- Período que cubre este pago
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    paid_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: audit_log
-- Registro de cambios importantes: upgrades, downgrades, cancelaciones.
-- Poblado por triggers.
CREATE TABLE audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    user_id         UUID,
    subscription_id UUID,
    event_type      VARCHAR(100) NOT NULL,
    old_data        JSONB,   -- Estado anterior (snapshot)
    new_data        JSONB,   -- Estado nuevo (snapshot)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ÍNDICES
CREATE INDEX idx_subscriptions_user     ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status   ON subscriptions(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_subscriptions_expiry   ON subscriptions(current_period_end) WHERE status = 'ACTIVE';
CREATE INDEX idx_payments_subscription  ON payments(subscription_id);
CREATE INDEX idx_payments_user          ON payments(user_id);
CREATE INDEX idx_payments_status        ON payments(status);
CREATE INDEX idx_audit_log_user         ON audit_log(user_id);
CREATE INDEX idx_audit_log_created      ON audit_log(created_at DESC);


--                                              FUNCIONES



-- FUNCIÓN: fn_get_active_subscription(p_user_id UUID) --> subscription_id, plan, status
-- Retorna la suscripción activa de un usuario.
-- El servicio la llama para verificar si el usuario puede acceder a contenido.
CREATE OR REPLACE FUNCTION fn_get_active_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name       VARCHAR,
    video_quality   VARCHAR,
    max_streams     SMALLINT,
    period_end      TIMESTAMPTZ,
    status          VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.subscription_id,
        p.name,
        p.video_quality,
        p.max_streams,
        s.current_period_end,
        s.status
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.user_id = p_user_id
      AND s.status = 'ACTIVE'
    LIMIT 1;
END;
$$;


-- FUNCIÓN: fn_can_access_content(p_user_id UUID) --> BOOLEAN
-- Verificación rápida: ¿tiene el usuario una suscripción activa y vigente?
-- Usada como guard antes de procesar requests de reproducción.
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

-- Alias usado por otros servicios para consultar acceso activo con el nombre
-- estándar del documento técnico del módulo de suscripciones.
CREATE OR REPLACE FUNCTION fn_has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
BEGIN
    RETURN fn_can_access_content(p_user_id);
END;
$$;

-- FUNCIÓN: fn_calculate_local_price
-- Calcula el monto visible en moneda local con el rate obtenido del FX Service.
CREATE OR REPLACE FUNCTION fn_calculate_local_price(
    p_price_usd NUMERIC,
    p_exchange_rate NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
BEGIN
    RETURN ROUND(p_price_usd * p_exchange_rate, 2);
END;
$$;


-- FUNCIÓN: fn_update_timestamp()
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


--                                                  TRIGGERS

-- TRIGGER: trg_one_active_subscription
-- TABLA:   subscriptions | EVENTO: BEFORE INSERT
-- Garantiza que un usuario solo tenga UNA suscripción ACTIVE a la vez.
-- Antes de crear una nueva, la anterior debe estar CANCELLED o EXPIRED.
CREATE OR REPLACE FUNCTION fn_one_active_subscription()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        SELECT COUNT(*) INTO v_active_count
        FROM subscriptions
        WHERE user_id = NEW.user_id AND status = 'ACTIVE';

        IF v_active_count > 0 THEN
            RAISE EXCEPTION
                'El usuario % ya tiene una suscripción activa. Cancélela antes de crear una nueva.',
                NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_one_active_subscription
    BEFORE INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION fn_one_active_subscription();


-- TRIGGER: trg_audit_subscription_change
-- TABLA:   subscriptions | EVENTO: AFTER INSERT OR UPDATE
-- Registra en audit_log altas, cancelaciones y cambios de plan/estado.
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
            jsonb_build_object(
                'status', NEW.status,
                'plan_id', NEW.plan_id
            )
        );
        RETURN NEW;
    END IF;

    -- Solo auditamos si cambia algo relevante
    IF OLD.status IS DISTINCT FROM NEW.status
    OR OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
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
            jsonb_build_object(
                'status',  OLD.status,
                'plan_id', OLD.plan_id
            ),
            jsonb_build_object(
                'status',  NEW.status,
                'plan_id', NEW.plan_id
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_subscription_change
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_subscription_change();

-- Trigger updated_at
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();


--                                                  PROCEDIMIENTOS ALMACENADOS
-- PROCEDIMIENTO: sp_create_subscription
-- FLUJO COMPLETO de contratación de un plan en una sola transacción:
--   1. Valida que el plan exista y esté activo
--   2. Crea la suscripción (el trigger valida que no haya otra activa)
--   3. Registra el pago
-- Si cualquier paso falla, todo hace rollback.
-- El Subscription Service llama este SP después de confirmar el pago externo.

CREATE OR REPLACE PROCEDURE sp_create_subscription(
    p_user_id        UUID,
    p_plan_id        INT,
    p_amount_usd     NUMERIC(10,2),
    p_display_currency VARCHAR,
    p_display_amount   NUMERIC(10,2),
    p_gateway_ref    VARCHAR,
    p_payment_method VARCHAR,
    OUT p_subscription_id UUID,
    OUT p_payment_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_plan_price NUMERIC;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- 1. Validar plan
    SELECT price_usd INTO v_plan_price
    FROM plans
    WHERE plan_id = p_plan_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El plan % no existe o no está disponible.', p_plan_id;
    END IF;

    -- 2. Calcular fin de período (1 mes desde hoy)
    v_period_end := NOW() + INTERVAL '1 month';

    -- 3. Crear suscripción (el trigger trg_one_active_subscription valida aquí)
    INSERT INTO subscriptions(
        user_id, plan_id, status,
        current_period_start, current_period_end
    )
    VALUES (p_user_id, p_plan_id, 'ACTIVE', NOW(), v_period_end)
    RETURNING subscription_id INTO p_subscription_id;

    -- 4. Registrar el pago
    INSERT INTO payments(
        subscription_id, user_id, plan_id,
        amount_usd, display_currency, display_amount,
        status, gateway_ref, payment_method,
        period_start, period_end
    )
    VALUES (
        p_subscription_id, p_user_id, p_plan_id,
        p_amount_usd, p_display_currency, p_display_amount,
        'COMPLETED', p_gateway_ref, p_payment_method,
        NOW(), v_period_end
    )
    RETURNING payment_id INTO p_payment_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-lanzamos el error para que la aplicación sepa qué falló
        RAISE;
END;
$$;


-- PROCEDIMIENTO: sp_cancel_subscription
-- Cancela la suscripción activa de un usuario.
-- El servicio sigue activo hasta que termine el período pagado (cancel_at).
CREATE OR REPLACE PROCEDURE sp_cancel_subscription(
    p_user_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_sub_id UUID;
    v_period_end TIMESTAMPTZ;
BEGIN
    SELECT subscription_id, current_period_end
    INTO v_sub_id, v_period_end
    FROM subscriptions
    WHERE user_id = p_user_id AND status = 'ACTIVE'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró suscripción activa para el usuario %.', p_user_id;
    END IF;

    UPDATE subscriptions
    SET
        status        = 'CANCELLED',
        cancelled_at  = NOW(),
        cancel_at     = v_period_end,  -- Acceso hasta fin del período
        auto_renew    = FALSE
    WHERE subscription_id = v_sub_id;
    -- El trigger trg_audit_subscription_change registra esto automáticamente
END;
$$;

-- FUNCIÓN: fn_process_subscription
-- Wrapper transaccional compatible con lib/pq para el Subscription Service Go.
-- Mantiene user_id como UUID proveniente de auth.users.user_id y plan_id como INT
-- según el catálogo canónico de este schema.
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

    -- Cambio de plan: se cancela la suscripción activa anterior antes de crear la nueva.
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


--                                  VISTAS

-- VISTA: v_user_subscription_detail
-- Todo lo que el panel de cuenta necesita mostrar sobre la suscripción.
CREATE OR REPLACE VIEW v_user_subscription_detail AS
SELECT
    s.subscription_id,
    s.user_id,
    p.name          AS plan_name,
    p.slug          AS plan_slug,
    p.price_usd,
    p.video_quality,
    p.max_streams,
    p.max_profiles,
    p.features,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.auto_renew,
    s.cancel_at,
    s.cancelled_at,
    -- Días restantes del período
    GREATEST(0, EXTRACT(DAY FROM (s.current_period_end - NOW()))::INT) AS days_remaining
FROM subscriptions s
JOIN plans p ON s.plan_id = p.plan_id
WHERE s.status IN ('ACTIVE', 'CANCELLED');  -- Incluimos cancelled para el período de gracia


-- VISTA: v_payment_history
-- Historial de pagos con nombre del plan para mostrarlo en el perfil.
CREATE OR REPLACE VIEW v_payment_history AS
SELECT
    pay.payment_id,
    pay.user_id,
    pl.name         AS plan_name,
    pay.amount_usd,
    pay.display_currency,
    pay.display_amount,
    pay.status,
    pay.payment_method,
    pay.gateway_ref,
    pay.period_start,
    pay.period_end,
    pay.paid_at
FROM payments pay
JOIN plans pl ON pay.plan_id = pl.plan_id
ORDER BY pay.paid_at DESC;

-- Vistas de compatibilidad usadas en documentación y consultas de revisión técnica.
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


-- DATOS INICIALES ---> esto es opcional si quieres lo borras, pal que este haciendo esto

INSERT INTO plans (name, slug, price_usd, max_profiles, max_streams, video_quality, features)
VALUES
    ('Básico', 'basic', 7.99, 1, 1, 'SD',
     '["Resolución SD (480p)", "1 pantalla simultánea", "1 perfil y una coquita"]'),
    ('Estándar', 'standard', 13.99, 3, 2, 'HD',
     '["Resolución HD (1080p)", "2 pantallas simultáneas", "Hasta 3 perfiles"]'),
    ('Premium', 'premium', 19.99, 5, 4, 'UHD',
     '["Resolución 4K UHD", "4 pantallas simultáneas", "Hasta 5 perfiles", "Audio ASRM"]')
ON CONFLICT DO NOTHING;


