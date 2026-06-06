
--  Gestiona conversiones de divisas y registra el historial de
--  tipos de cambio consultados. Redis es la capa primaria de caché; esta BD es la capa de persistencia y auditoría.
--
-- ARQUITECTURA DE CACHE:
--   FX Service recibe petición --> busca en Redis (TTL 1h)
--     --> Si hay cache: devuelve directo (sin tocar esta BD)
--     --> Si no hay cache: consulta API externa --> guarda en Redis + en esta BD
--
-- Esta BD sirve para:
--   1. Auditoría: registro histórico de todos los tipos de cambio consultados
--   2. Fallback: si Redis y la API externa fallan, usar el último tipo conocido
--   3. Reportes: historial de variación de tipos de cambio


DROP SCHEMA IF EXISTS fx CASCADE;
CREATE SCHEMA fx;
SET search_path TO fx;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


--                                                  TABLAS
-- TABLA: currencies
-- Catálogo de divisas soportadas por la plataforma.

CREATE TABLE currencies (
    currency_code  CHAR(3) PRIMARY KEY,     -- 'USD', 'GTQ', 'MXN', 'EUR'
    currency_name  VARCHAR(100) NOT NULL,   -- 'Dólar estadounidense'
    symbol         VARCHAR(10) NOT NULL,    -- '$', 'Q', '€'
    country_code   CHAR(2),                 -- 'US', 'GT', 'MX' (ISO 3166-1)
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    decimal_places SMALLINT NOT NULL DEFAULT 2
);


-- TABLA: exchange_rates
-- Historial de tipos de cambio consultados desde la API externa.
-- Base siempre en USD (cuántos [currency] valen 1 USD).
-- Ej: rate = 7.79 para GTQ significa: 1 USD = 7.79 GTQ

CREATE TABLE exchange_rates (
    rate_id         BIGSERIAL PRIMARY KEY,
    base_currency   CHAR(3) NOT NULL DEFAULT 'USD',
    target_currency CHAR(3) NOT NULL REFERENCES currencies(currency_code),
    rate            NUMERIC(20, 8) NOT NULL CHECK (rate > 0),
    -- Fuente de donde vino este tipo de cambio
    source_provider VARCHAR(100),           -- 'exchangerate-api.com', 'fixer.io'
    -- Cuándo fue válido este tipo de cambio según el proveedor
    valid_at        TIMESTAMPTZ NOT NULL,
    -- Cuándo lo consultamos nosotros
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: rate_request_log
-- Log de cada petición de conversión recibida.
-- Útil para ver qué divisas piden más los usuarios y optimizar el TTL de Redis.

CREATE TABLE rate_request_log (
    log_id          BIGSERIAL PRIMARY KEY,
    target_currency CHAR(3) NOT NULL,
    -- Si vino de caché o de la API externa
    cache_hit       BOOLEAN NOT NULL DEFAULT FALSE,
    rate_used       NUMERIC(20, 8),
    -- IP del servicio que hizo la petición (Subscription Service)
    requested_by    VARCHAR(100),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ÍNDICES

-- El caso de uso más común: "dame el tipo de cambio más reciente para GTQ"
CREATE INDEX idx_exchange_rates_target  ON exchange_rates(target_currency, fetched_at DESC);
CREATE INDEX idx_exchange_rates_valid   ON exchange_rates(valid_at DESC);
CREATE INDEX idx_request_log_currency   ON rate_request_log(target_currency, requested_at DESC);
CREATE INDEX idx_request_log_cache      ON rate_request_log(cache_hit, requested_at DESC);



--                                                      TRIGGERS

-- TRIGGER: trg_validate_currency_active
-- TABLA:   exchange_rates | EVENTO: BEFORE INSERT
-- Impide guardar tipos de cambio para divisas desactivadas.

CREATE OR REPLACE FUNCTION fn_validate_currency_active()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_active
    FROM currencies
    WHERE currency_code = NEW.target_currency;

    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'La divisa % no está activa en el sistema.', NEW.target_currency;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_currency_active
    BEFORE INSERT ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_currency_active();


-- TRIGGER: trg_cleanup_old_rates
-- TABLA:   exchange_rates | EVENTO: AFTER INSERT
-- Mantiene solo los últimos 30 días de historial por divisa.
-- Evita que la tabla crezca indefinidamente.

CREATE OR REPLACE FUNCTION fn_cleanup_old_rates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM exchange_rates
    WHERE target_currency = NEW.target_currency
      AND fetched_at < NOW() - INTERVAL '30 days';

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_old_rates
    AFTER INSERT ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION fn_cleanup_old_rates();


--                                  PROCEDIMIENTOS ALMACENADOS

-- PROCEDIMIENTO: sp_save_rate
-- Guarda un nuevo tipo de cambio en la BD y registra el request.
-- El FX Service lo llama cada vez que consulta la API externa (no Redis).

CREATE OR REPLACE PROCEDURE sp_save_rate(
    p_target_currency VARCHAR,
    p_rate            NUMERIC,
    p_source_provider VARCHAR,
    p_valid_at        TIMESTAMPTZ,
    p_requested_by    VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Guardar el tipo de cambio
    INSERT INTO exchange_rates(
        base_currency, target_currency,
        rate, source_provider, valid_at
    )
    VALUES (
        'USD', p_target_currency,
        p_rate, p_source_provider, p_valid_at
    );

    -- 2. Registrar el request como cache_miss (fue a la API)
    INSERT INTO rate_request_log(target_currency, cache_hit, rate_used, requested_by)
    VALUES (p_target_currency, FALSE, p_rate, p_requested_by);
END;
$$;


--                                  VISTAS
-- VISTA: v_latest_rates
-- Muestra el tipo de cambio más reciente por divisa.
-- También calcula el precio de los planes en cada moneda (referencia informativa).
-- Útil para el frontend del panel de administración.

CREATE OR REPLACE VIEW v_latest_rates AS
SELECT DISTINCT ON (er.target_currency)
    er.target_currency,
    c.currency_name,
    c.symbol,
    er.rate,
    er.source_provider,
    er.valid_at,
    er.fetched_at,
    -- Cuánto tiempo hace que se actualizó
    EXTRACT(EPOCH FROM (NOW() - er.fetched_at)) / 3600 AS hours_since_update
FROM exchange_rates er
JOIN currencies c ON er.target_currency = c.currency_code
WHERE c.is_active = TRUE
ORDER BY er.target_currency, er.fetched_at DESC;


-- VISTA: v_cache_performance
-- Resumen de performance de caché por divisa en las últimas 24h.
-- El equipo de operaciones la usa para monitorear si los TTL de Redis son buenos.

CREATE OR REPLACE VIEW v_cache_performance AS
SELECT
    target_currency,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE cache_hit = TRUE) AS cache_hits,
    COUNT(*) FILTER (WHERE cache_hit = FALSE) AS cache_misses,
    fn_cache_hit_ratio(target_currency, 24) AS hit_ratio_pct,
    MAX(requested_at) AS last_request
FROM rate_request_log
WHERE requested_at > NOW() - INTERVAL '24 hours'
GROUP BY target_currency
ORDER BY total_requests DESC;


-- DATOS INICIALES

INSERT INTO currencies (currency_code, currency_name, symbol, country_code) VALUES
    ('USD', 'Dólar estadounidense', '$',  'US'),
    ('GTQ', 'Quetzal guatemalteco', 'Q',  'GT'),
    ('MXN', 'Peso mexicano',        '$',  'MX'),
    ('EUR', 'Euro',                 '€',  'EU'),
    ('COP', 'Peso colombiano',      '$',  'CO'),
    ('BRL', 'Real brasileño',       'R$', 'BR'),
    ('HNL', 'Lempira hondureño',    'L',  'HN'),
    ('CRC', 'Colón costarricense',  '₡',  'CR')
ON CONFLICT DO NOTHING;

-- Tipo de cambio inicial hardcodeado (para que no falle en arranque si Redis y API están down)
-- En producción esto se actualiza automáticamente con la primera llamada al SP
INSERT INTO exchange_rates (target_currency, rate, source_provider, valid_at) VALUES
    ('GTQ', 7.79,    'seed', NOW()),
    ('MXN', 17.15,   'seed', NOW()),
    ('EUR', 0.92,    'seed', NOW()),
    ('COP', 3950.00, 'seed', NOW()),
    ('BRL', 5.05,    'seed', NOW()),
    ('HNL', 24.70,   'seed', NOW()),
    ('CRC', 519.00,  'seed', NOW())
ON CONFLICT DO NOTHING;

