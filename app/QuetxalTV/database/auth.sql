

-- Limpieza para re-ejecución en desarrollo
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth;
SET search_path TO auth;


-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- Para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Para hash de contraseñas con crypt()


--                                                  TABLAS



-- TABLA: users
-- Representa una cuenta registrada en la plataforma.
-- Un usuario puede tener hasta 5 perfiles (se valida por trigger).
CREATE TABLE users (
    user_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        VARCHAR(255) NOT NULL UNIQUE,
    -- La contraseña se guarda hasheada con pgcrypto (crypt + gen_salt)
    password_hash VARCHAR(255),
    -- Para login con OAuth no hay password, se guarda el proveedor
    oauth_provider VARCHAR(50),   -- 'google', 'github', NULL si es local
    oauth_sub      VARCHAR(255),  -- ID único del proveedor OAuth
    role          VARCHAR(20) NOT NULL DEFAULT 'client'
                  CHECK (role IN ('client', 'admin')),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);


-- TABLA: profiles
-- Cada usuario puede tener hasta 5 perfiles independientes.
-- El trigger fn_limit_profiles_per_user valida el límite.
CREATE TABLE profiles (
    profile_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    -- avatar_url puede ser una URL externa o un ID de imagen en el catálogo
    avatar_url   VARCHAR(500),
    -- Preferencias de contenido (lenguaje, clasificación máxima, etc.)
    -- Guardado como JSONB para flexibilidad sin migración
    preferences  JSONB NOT NULL DEFAULT '{}',
    is_kids_mode BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: refresh_tokens
-- Almacena los refresh tokens activos para renovación de JWT.
-- El access token (JWT) es stateless, pero el refresh token se valida aquí.

CREATE TABLE refresh_tokens (
    token_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash   VARCHAR(512) NOT NULL UNIQUE,  -- Hash del token, nunca el token raw
    -- A qué dispositivo/sesión pertenece este token
    device_info  VARCHAR(255),
    ip_address   INET,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- TABLA: audit_log
-- Registro automático de eventos de seguridad críticos.
-- Poblado EXCLUSIVAMENTE por triggers, no por la aplicación directamente.

CREATE TABLE audit_log (
    log_id       BIGSERIAL PRIMARY KEY,
    user_id      UUID,                  -- NULL si el usuario ya no existe
    event_type   VARCHAR(100) NOT NULL, -- 'PASSWORD_CHANGE', 'LOGIN_FAILED', etc.
    description  TEXT,
    ip_address   INET,
    metadata     JSONB DEFAULT '{}',   -- Info adicional del evento
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ÍNDICES

CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_oauth          ON users(oauth_provider, oauth_sub) WHERE oauth_provider IS NOT NULL;
CREATE INDEX idx_profiles_user_id     ON profiles(user_id);
CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id) WHERE revoked = FALSE;
CREATE INDEX idx_refresh_tokens_hash  ON refresh_tokens(token_hash);
CREATE INDEX idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX idx_audit_log_created    ON audit_log(created_at DESC);


-- FUNCIONES (lógica modular reutilizable)



-- FUNCIÓN: fn_count_profiles(p_user_id UUID) --> INTEGER
-- Retorna cuántos perfiles activos tiene un usuario.
-- Usada por el trigger de límite y por la aplicación para validaciones.

CREATE OR REPLACE FUNCTION fn_count_profiles(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM profiles
    WHERE user_id = p_user_id;

    RETURN v_count;
END;
$$;


-- FUNCIÓN: fn_verify_password(p_email VARCHAR, p_password VARCHAR) --> BOOLEAN
-- Verifica si la contraseña plana coincide con el hash almacenado.
-- Centraliza la lógica de verificación en la BD.
-- USO: SELECT fn_verify_password('user@mail.com', 'mipass123');

CREATE OR REPLACE FUNCTION fn_verify_password(
    p_email    VARCHAR,
    p_password VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_hash VARCHAR;
BEGIN
    SELECT password_hash INTO v_hash
    FROM users
    WHERE email = p_email AND is_active = TRUE;

    IF v_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    -- crypt() de pgcrypto compara la contraseña con su propio hash
    RETURN (v_hash = crypt(p_password, v_hash));
END;
$$;


-- FUNCIÓN: fn_update_timestamp() --> TRIGGER
-- Actualiza automáticamente updated_at en cualquier tabla que la use.

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- TRIGGERS



-- TRIGGER: trg_limit_profiles_per_user
-- TABLA:   profiles | EVENTO: BEFORE INSERT
-- Impide crear un 6to perfil. El enunciado dice máximo 5.

CREATE OR REPLACE FUNCTION fn_limit_profiles_per_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF fn_count_profiles(NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'El usuario ya tiene el máximo de 5 perfiles permitidos.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_profiles_per_user
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_limit_profiles_per_user();


-- TRIGGER: trg_audit_password_change
-- TABLA:   users | EVENTO: AFTER UPDATE
-- Registra en audit_log cuando cambia el hash de la contraseña.
-- La app NO necesita escribir en audit_log para esto, el trigger lo hace solo.

CREATE OR REPLACE FUNCTION fn_audit_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        INSERT INTO audit_log(user_id, event_type, description)
        VALUES (NEW.user_id, 'PASSWORD_CHANGE', 'El usuario cambió su contraseña.');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_password_change
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_password_change();


-- TRIGGER: trg_audit_account_deactivation
-- TABLA:   users | EVENTO: AFTER UPDATE
-- Registra cuando una cuenta es desactivada (soft delete).

CREATE OR REPLACE FUNCTION fn_audit_account_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        INSERT INTO audit_log(user_id, event_type, description)
        VALUES (NEW.user_id, 'ACCOUNT_DEACTIVATED', 'La cuenta fue desactivada.');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_account_deactivation
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_account_deactivation();


-- TRIGGERS: updated_at automático

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();


-- PROCEDIMIENTOS ALMACENADOS (flujos transaccionales completos)



-- PROCEDIMIENTO: sp_register_user
-- Registra un usuario nuevo con su perfil inicial por defecto en una sola
-- transacción. Si algo falla, hace rollback completo.
-- USO DESDE LA APP: CALL sp_register_user('mail@x.com', 'pass', 'Mi Perfil', NULL);

CREATE OR REPLACE PROCEDURE sp_register_user(
    p_email        VARCHAR,
    p_password     VARCHAR,   -- Contraseña en texto plano (se hashea aquí)
    p_display_name VARCHAR,
    p_role           VARCHAR DEFAULT 'client',
    p_oauth_provider VARCHAR DEFAULT NULL,
    p_oauth_sub      VARCHAR DEFAULT NULL,
    OUT p_user_id  UUID,
    OUT p_profile_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Insertar usuario. La contraseña se hashea con bcrypt (costo 12)
    INSERT INTO users(email, password_hash, oauth_provider, oauth_sub)
    VALUES (
        p_email,
        CASE
            WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf', 12))
            ELSE NULL
        END,
        p_oauth_provider,
        p_oauth_sub
    )
    RETURNING user_id INTO p_user_id;

    -- 2. Crear el perfil inicial (el trigger de límite no aplica aquí porque es el primero)
    INSERT INTO profiles(user_id, display_name)
    VALUES (p_user_id, p_display_name)
    RETURNING profile_id INTO p_profile_id;

    -- 3. Registrar en auditoría el registro exitoso
    INSERT INTO audit_log(user_id, event_type, description)
    VALUES (p_user_id, 'USER_REGISTERED', 'Nuevo usuario registrado en la plataforma.');

-- Si cualquier INSERT falla (ej: email duplicado), PostgreSQL hace rollback automático
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'El correo % ya está registrado.', p_email;
END;
$$;


-- PROCEDIMIENTO: sp_revoke_all_tokens
-- Invalida todos los refresh tokens de un usuario (logout en todos los dispositivos
-- o ante cambio de contraseña). Operación atómica.

CREATE OR REPLACE PROCEDURE sp_revoke_all_tokens(
    p_user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE
    WHERE user_id = p_user_id AND revoked = FALSE;

    INSERT INTO audit_log(user_id, event_type, description)
    VALUES (p_user_id, 'ALL_TOKENS_REVOKED', 'Todas las sesiones fueron cerradas.');
END;
$$;


-- VISTAS



-- VISTA: v_user_profiles_summary
-- Devuelve el resumen de un usuario con todos sus perfiles.
-- El Auth Service la usa para construir el JWT payload al hacer login.
CREATE OR REPLACE VIEW v_user_profiles_summary AS
SELECT
    u.user_id,
    u.email,
    u.role,
    u.oauth_provider,
    u.is_active,
    u.created_at AS member_since,
    COALESCE(
        json_agg(
            json_build_object(
                'profile_id',   p.profile_id,
                'display_name', p.display_name,
                'avatar_url',   p.avatar_url,
                'is_kids_mode', p.is_kids_mode
            ) ORDER BY p.created_at
        ) FILTER (WHERE p.profile_id IS NOT NULL),
        '[]'
    ) AS profiles,
    COUNT(p.profile_id) AS profile_count
FROM users u
LEFT JOIN profiles p ON u.user_id = p.user_id
GROUP BY u.user_id;


-- VISTA: v_active_sessions
-- Muestra los refresh tokens activos por usuario (para el panel "mis dispositivos").

CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    rt.token_id,
    rt.user_id,
    u.email,
    rt.device_info,
    rt.ip_address,
    rt.expires_at,
    rt.created_at AS session_started
FROM refresh_tokens rt
JOIN users u ON rt.user_id = u.user_id
WHERE rt.revoked = FALSE
  AND rt.expires_at > NOW();


