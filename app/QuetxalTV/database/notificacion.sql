
-- gestiona el envío de correos electrónicos y mantiene un registro de todas las notificaciones enviadas.
--   El Notification Service es "pasivo": otros servicios lo llaman via gRPC
--   cuando necesitan enviar un correo. Este servicio NO sabe de usuarios ni de planes, solo sabe enviar correos y registrarlos.
--
-- NOTA SOBRE IDs EXTERNOS:
--   user_id y otros IDs se guardan por referencia, sin FK reales.


DROP SCHEMA IF EXISTS notification CASCADE;
CREATE SCHEMA notification;
SET search_path TO notification;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


--                                              TABLAS

-- TABLA: notification_types
-- Catálogo de tipos de notificaciones disponibles.
-- Cada tipo está ligado a un template de correo.

CREATE TABLE notification_types (
    type_code    VARCHAR(50) PRIMARY KEY,
    -- 'WELCOME', 'PURCHASE_RECEIPT', 'NEW_CONTENT', 'PASSWORD_RESET', 'SUBSCRIPTION_CANCELLED'
    description  VARCHAR(255) NOT NULL,
    -- Nombre del archivo de template HTML (en la carpeta templates/ del servicio)
    template_file VARCHAR(100) NOT NULL,
    subject_template VARCHAR(500) NOT NULL,  -- Puede incluir variables: "Bienvenido, {{name}}"
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO notification_types(type_code, description, template_file, subject_template, is_active)
VALUES
    ('WELCOME', 'Correo de bienvenida', 'welcome.html', 'Bienvenido a Quetxal TV, {{name}}', TRUE),
    ('PURCHASE_RECEIPT', 'Recibo de compra', 'purchase.html', 'Recibo de compra - {{plan_name}}', TRUE);


-- TABLA: notifications
-- Registro de cada intento de envío de notificación.
-- Permite rastrear errores, reintentos y métricas de entrega.

CREATE TABLE notifications (
    notification_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- A quién se envió (user_id del Auth Service, sin FK real)
    user_id          UUID,
    -- Dirección de correo destino (guardada aquí porque el user podría cambiarla)
    recipient_email  VARCHAR(255) NOT NULL,
    recipient_name   VARCHAR(255),
    type_code        VARCHAR(50) NOT NULL REFERENCES notification_types(type_code),
    -- Estado del envío
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRYING')),
    -- Cuántos intentos se han hecho
    attempts         SMALLINT NOT NULL DEFAULT 0,
    max_attempts     SMALLINT NOT NULL DEFAULT 3,
    -- Datos dinámicos que se inyectaron en el template (JSON)
    -- Ej: {"name": "juanito", "plan_name": "Premium", "amount": "Q109.02"}
    template_data    JSONB NOT NULL DEFAULT '{}',
    -- Respuesta del servidor SMTP (para debug)
    smtp_response    TEXT,
    -- ID del mensaje asignado por el servidor SMTP
    message_id       VARCHAR(255),
    -- Cuándo fue enviado exitosamente
    sent_at          TIMESTAMPTZ,
    -- Cuándo reintentar si falló
    retry_after      TIMESTAMPTZ,
    -- Error message si falló
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: notification_audit_log
-- Log de cada cambio de estado de una notificación.
-- Trazabilidad completa: PENDING --> SENT, PENDING --> FAILED --> RETRYING --> SENT
-- Poblado por trigger.
CREATE TABLE notification_audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
    old_status      VARCHAR(20),
    new_status      VARCHAR(20) NOT NULL,
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ÍNDICES
CREATE INDEX idx_notifications_user     ON notifications(user_id);
CREATE INDEX idx_notifications_status   ON notifications(status);
-- Índice parcial para el worker que procesa envíos pendientes
CREATE INDEX idx_notifications_pending  ON notifications(created_at ASC)
    WHERE status IN ('PENDING', 'RETRYING');
-- Para el worker de reintentos
CREATE INDEX idx_notifications_retry    ON notifications(retry_after ASC)
    WHERE status = 'RETRYING' AND retry_after IS NOT NULL;
CREATE INDEX idx_audit_log_notif        ON notification_audit_log(notification_id);


--                              FUNCIONES


-- FUNCIÓN: fn_get_pending_notifications(p_limit INT) --> TABLE
-- Devuelve las notificaciones pendientes de enviar.
-- El worker de Python la consulta cada N segundos para procesar la cola.
CREATE OR REPLACE FUNCTION fn_get_pending_notifications(p_limit INT DEFAULT 10)
RETURNS TABLE (
    notification_id  UUID,
    recipient_email  VARCHAR,
    recipient_name   VARCHAR,
    type_code        VARCHAR,
    template_file    VARCHAR,
    subject_template VARCHAR,
    template_data    JSONB,
    attempts         SMALLINT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.notification_id,
        n.recipient_email,
        n.recipient_name,
        n.type_code,
        nt.template_file,
        nt.subject_template,
        n.template_data,
        n.attempts
    FROM notifications n
    JOIN notification_types nt ON n.type_code = nt.type_code
    WHERE n.status IN ('PENDING', 'RETRYING')
      AND (n.retry_after IS NULL OR n.retry_after <= NOW())
      AND n.attempts < n.max_attempts
    ORDER BY n.created_at ASC
    LIMIT p_limit
    -- FOR UPDATE SKIP LOCKED evita que dos workers procesen la misma notificación
    FOR UPDATE SKIP LOCKED;
END;
$$;


-- FUNCIÓN: fn_notification_stats(p_days INT) --> TABLE
-- Estadísticas de envío para monitoreo del servicio.
-- Úsala en dashboards o alertas de operaciones.

CREATE OR REPLACE FUNCTION fn_notification_stats(p_days INT DEFAULT 7)
RETURNS TABLE (
    type_code    VARCHAR,
    total        BIGINT,
    sent         BIGINT,
    failed       BIGINT,
    success_rate NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.type_code,
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE n.status = 'SENT')      AS sent,
        COUNT(*) FILTER (WHERE n.status = 'FAILED')    AS failed,
        ROUND(
            COUNT(*) FILTER (WHERE n.status = 'SENT')::NUMERIC
            / NULLIF(COUNT(*), 0) * 100,
        2) AS success_rate
    FROM notifications n
    WHERE n.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY n.type_code
    ORDER BY total DESC;
END;
$$;


-- FUNCIÓN: fn_update_timestamp()
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


--                                      TRIGGERS

-- TRIGGER: trg_audit_notification_status
-- TABLA:   notifications | EVENTO: AFTER UPDATE
-- Registra en audit_log cada cambio de estado.
-- El equipo de soporte puede ver la historia completa de cada notificación.

CREATE OR REPLACE FUNCTION fn_audit_notification_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO notification_audit_log(notification_id, old_status, new_status, message)
        VALUES (
            NEW.notification_id,
            OLD.status,
            NEW.status,
            CASE NEW.status
                WHEN 'SENT'     THEN 'Enviado exitosamente. SMTP: ' || COALESCE(NEW.smtp_response, 'OK')
                WHEN 'FAILED'   THEN 'Error: ' || COALESCE(NEW.error_message, 'desconocido')
                WHEN 'RETRYING' THEN 'Reintento #' || NEW.attempts || ' programado para ' || NEW.retry_after::TEXT
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_notification_status
    AFTER UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_notification_status();


-- TRIGGER: trg_increment_attempts
-- TABLA:   notifications | EVENTO: BEFORE UPDATE
-- Cuando el status cambia a RETRYING, incrementa automáticamente el contador
-- de intentos y calcula la próxima fecha de reintento (backoff exponencial).

CREATE OR REPLACE FUNCTION fn_increment_attempts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Solo actúa cuando cambia a RETRYING
    IF NEW.status = 'RETRYING' AND OLD.status != 'RETRYING' THEN
        NEW.attempts := OLD.attempts + 1;
        -- Backoff exponencial: intento 1 --> 5min, intento 2 --> 25min, intento 3 --> 125min
        NEW.retry_after := NOW() + (INTERVAL '5 minutes' * POWER(5, NEW.attempts - 1));
    END IF;

    -- Si se marca como FAILED definitivo, registrar cuántos intentos se hicieron
    IF NEW.status = 'FAILED' AND OLD.status = 'RETRYING' THEN
        NEW.attempts := OLD.attempts + 1;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_attempts
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION fn_increment_attempts();

-- Trigger updated_at
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();


-- PROCEDIMIENTOS ALMACENADOS



-- PROCEDIMIENTO: sp_queue_notification
-- Encola una nueva notificación para ser enviada por el worker.
-- Los otros microservicios lo llaman via gRPC --> Python --> este SP.

CREATE OR REPLACE PROCEDURE sp_queue_notification(
    p_user_id         UUID,
    p_recipient_email VARCHAR,
    p_recipient_name  VARCHAR,
    p_type_code       VARCHAR,
    p_template_data   JSONB,
    OUT p_notification_id UUID
)
LANGUAGE plpgsql AS $$
BEGIN
    -- Validar que el tipo de notificación exista y esté activo
    IF NOT EXISTS (
        SELECT 1 FROM notification_types
        WHERE type_code = p_type_code AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Tipo de notificación % no existe o está inactivo.', p_type_code;
    END IF;

    INSERT INTO notifications(
        user_id, recipient_email, recipient_name,
        type_code, template_data, status
    )
    VALUES (
        p_user_id, p_recipient_email, p_recipient_name,
        p_type_code, p_template_data, 'PENDING'
    )
    RETURNING notification_id INTO p_notification_id;
END;
$$;


-- PROCEDIMIENTO: sp_mark_sent
-- El worker llama este SP después de enviar exitosamente un correo.

CREATE OR REPLACE PROCEDURE sp_mark_sent(
    p_notification_id UUID,
    p_message_id      VARCHAR,
    p_smtp_response   TEXT DEFAULT 'OK'
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE notifications
    SET
        status        = 'SENT',
        message_id    = p_message_id,
        smtp_response = p_smtp_response,
        sent_at       = NOW()
    WHERE notification_id = p_notification_id;
    -- El trigger trg_audit_notification_status registra el cambio automáticamente
END;
$$;


-- PROCEDIMIENTO: sp_mark_failed
-- El worker llama este SP cuando falla el envío.
-- Decide si hacer RETRYING (si quedan intentos) o FAILED definitivo.

CREATE OR REPLACE PROCEDURE sp_mark_failed(
    p_notification_id UUID,
    p_error_message   TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_attempts INT;
    v_max_attempts INT;
BEGIN
    SELECT attempts, max_attempts
    INTO v_attempts, v_max_attempts
    FROM notifications
    WHERE notification_id = p_notification_id;

    IF v_attempts + 1 >= v_max_attempts THEN
        -- Sin más reintentos: marcar como fallo definitivo
        UPDATE notifications
        SET status = 'FAILED', error_message = p_error_message
        WHERE notification_id = p_notification_id;
    ELSE
        -- Todavía hay reintentos: el trigger fn_increment_attempts calcula retry_after
        UPDATE notifications
        SET status = 'RETRYING', error_message = p_error_message
        WHERE notification_id = p_notification_id;
    END IF;
END;
$$;


--                                                      VISTAS
-- VISTA: v_notification_queue
-- Cola de notificaciones pendientes con toda la info que necesita el worker.
-- Alternativa a fn_get_pending_notifications para consultas rápidas sin bloqueo.

CREATE OR REPLACE VIEW v_notification_queue AS
SELECT
    n.notification_id,
    n.recipient_email,
    n.recipient_name,
    n.type_code,
    nt.template_file,
    nt.subject_template,
    n.template_data,
    n.status,
    n.attempts,
    n.max_attempts,
    n.retry_after,
    n.created_at
FROM notifications n
JOIN notification_types nt ON n.type_code = nt.type_code
WHERE n.status IN ('PENDING', 'RETRYING')
  AND (n.retry_after IS NULL OR n.retry_after <= NOW())
  AND n.attempts < n.max_attempts
ORDER BY n.created_at ASC;


-- VISTA: v_notification_history
-- Historial completo con logs de cambio de estado por notificación.
-- Para el panel de administración o soporte.

CREATE OR REPLACE VIEW v_notification_history AS
SELECT
    n.notification_id,
    n.user_id,
    n.recipient_email,
    n.type_code,
    n.status,
    n.attempts,
    n.sent_at,
    n.error_message,
    n.created_at,
    -- Historial de estados como JSON array
    COALESCE(
        (SELECT JSON_AGG(
            jsonb_build_object(
                'from', al.old_status,
                'to',   al.new_status,
                'msg',  al.message,
                'at',   al.created_at
            ) ORDER BY al.created_at
        )
        FROM notification_audit_log al
        WHERE al.notification_id = n.notification_id),
        '[]'
    ) AS status_history
FROM notifications n
ORDER BY n.created_at DESC;


