BEGIN;

-- =========================================================
--  RECREACIÓN LIMPIA
-- =========================================================
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth;

-- Muy importante:
-- Las extensiones normalmente viven en public.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA public;

-- Úsalo como apoyo, no como única forma de resolver objetos.
SET search_path TO auth, public;


-- =========================================================
--  TABLAS
-- =========================================================

-- ---------------------------------------------------------
-- auth.users
-- ---------------------------------------------------------
CREATE TABLE auth.users (
    user_id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_sub VARCHAR(255),

    role VARCHAR(20) NOT NULL DEFAULT 'client'
        CHECK (role IN ('client', 'admin')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INTEGER NOT NULL DEFAULT 1 CHECK (token_version >= 1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_users_auth_method
    CHECK (
        (
            password_hash IS NOT NULL
            AND oauth_provider IS NULL
            AND oauth_sub IS NULL
        )
        OR
        (
            password_hash IS NULL
            AND oauth_provider IS NOT NULL
            AND oauth_sub IS NOT NULL
        )
    )
);

COMMENT ON TABLE auth.users IS 'Cuenta principal del usuario.';
COMMENT ON COLUMN auth.users.password_hash IS 'Hash bcrypt generado con pgcrypto.';
COMMENT ON COLUMN auth.users.token_version IS 'Versión para invalidar JWTs previos.';


-- admin@example.com 
-- 12345678


-- ---------------------------------------------------------
-- auth.profiles
-- ---------------------------------------------------------
CREATE TABLE auth.profiles (
    profile_id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    user_id UUID NOT NULL
        REFERENCES auth.users(user_id)
        ON DELETE CASCADE,

    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_kids_mode BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth.profiles IS 'Perfiles del usuario. Máximo 5 por cuenta.';


-- ---------------------------------------------------------
-- auth.refresh_tokens
-- ---------------------------------------------------------
CREATE TABLE auth.refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    user_id UUID NOT NULL
        REFERENCES auth.users(user_id)
        ON DELETE CASCADE,

    token_hash VARCHAR(512) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth.refresh_tokens IS 'Refresh tokens activos/inactivos por sesión.';


-- ---------------------------------------------------------
-- auth.verification_tokens
-- ---------------------------------------------------------
CREATE TABLE auth.verification_tokens (
    verification_token_id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    user_id UUID NOT NULL
        REFERENCES auth.users(user_id)
        ON DELETE CASCADE,

    token_hash VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth.verification_tokens IS 'Tokens de verificación para activación o reset de contraseña.';


-- ---------------------------------------------------------
-- auth.audit_log
-- ---------------------------------------------------------
CREATE TABLE auth.audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth.audit_log IS 'Eventos críticos de seguridad y auditoría.';


-- =========================================================
-- AUDITORÍA TRANSACCIONAL DETALLADA
-- =========================================================
CREATE TABLE auth.audit_trail (
    audit_id BIGSERIAL PRIMARY KEY,

    table_name TEXT NOT NULL,
    operation  VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE

    user_id UUID NULL, -- quién hizo el cambio (si lo conocemos)
    
    record_id TEXT NULL, -- PK del registro afectado (como texto genérico)

    old_data JSONB, -- estado antes
    new_data JSONB, -- estado después

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_trail_table ON auth.audit_trail(table_name);
CREATE INDEX idx_audit_trail_user ON auth.audit_trail(user_id);
CREATE INDEX idx_audit_trail_date ON auth.audit_trail(changed_at DESC);

COMMENT ON TABLE auth.audit_trail IS 'Auditoría detallada de cambios (INSERT/UPDATE/DELETE).';




-- =========================================================
--  ÍNDICES
-- =========================================================

-- users
CREATE INDEX idx_users_email ON auth.users(email);

CREATE UNIQUE INDEX idx_users_oauth_unique
    ON auth.users(oauth_provider, oauth_sub)
    WHERE oauth_provider IS NOT NULL AND oauth_sub IS NOT NULL;

-- profiles
CREATE INDEX idx_profiles_user_id ON auth.profiles(user_id);

-- refresh_tokens
CREATE INDEX idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_revoked ON auth.refresh_tokens(user_id, revoked);
CREATE INDEX idx_refresh_tokens_expires_at ON auth.refresh_tokens(expires_at);

-- verification_tokens
CREATE INDEX idx_verification_tokens_user ON auth.verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_hash ON auth.verification_tokens(token_hash);
CREATE INDEX idx_verification_tokens_user_used ON auth.verification_tokens(user_id, used);
CREATE INDEX idx_verification_tokens_expires_at ON auth.verification_tokens(expires_at);

-- audit_log
CREATE INDEX idx_audit_log_user_id ON auth.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at_desc ON auth.audit_log(created_at DESC);



-- =========================================================
--  FUNCIONES AUXILIARES
-- =========================================================

-- ---------------------------------------------------------
-- Cuenta perfiles de un usuario
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_count_profiles(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM auth.profiles
    WHERE user_id = p_user_id;

    RETURN v_count;
END;
$$;


-- ---------------------------------------------------------
-- Verifica contraseña usando pgcrypto
-- Solo usuarios activos
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_verify_password(
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_hash VARCHAR;
BEGIN
    SELECT u.password_hash
    INTO v_hash
    FROM auth.users u
    WHERE u.email = p_email
      AND u.is_active = TRUE;

    IF v_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN v_hash = public.crypt(p_password, v_hash);
END;
$$;


-- ---------------------------------------------------------
-- Actualiza updated_at automáticamente
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------
-- Limita a máximo 5 perfiles por usuario
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_limit_profiles_per_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.fn_count_profiles(NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'El usuario ya tiene el máximo de 5 perfiles permitidos.';
    END IF;

    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------
-- Evita eliminar el último perfil de un usuario
-- Segunda línea de defensa a nivel DB
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_prevent_delete_last_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.fn_count_profiles(OLD.user_id) <= 1 THEN
        RAISE EXCEPTION 'No se puede eliminar el único perfil del usuario.';
    END IF;

    RETURN OLD;
END;
$$;


-- ---------------------------------------------------------
-- Incrementa token_version cuando cambia la contraseña
-- Esto invalida access tokens viejos automáticamente
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_bump_token_version_on_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        NEW.token_version = OLD.token_version + 1;
    END IF;

    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------
-- Auditoría: cambio de contraseña
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_audit_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO auth.audit_log(user_id, event_type, description)
    VALUES (
        NEW.user_id,
        'PASSWORD_CHANGE',
        'El usuario cambió su contraseña.'
    );

    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------
-- Auditoría: desactivación de cuenta
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fn_audit_account_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO auth.audit_log(user_id, event_type, description)
    VALUES (
        NEW.user_id,
        'ACCOUNT_DEACTIVATED',
        'La cuenta fue desactivada.'
    );

    RETURN NEW;
END;
$$;



-- =========================================================
--  TRIGGERS
-- =========================================================

-- ---------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.fn_update_timestamp();

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON auth.profiles
FOR EACH ROW
EXECUTE FUNCTION auth.fn_update_timestamp();


-- ---------------------------------------------------------
-- bump token_version cuando cambia password
-- ---------------------------------------------------------
CREATE TRIGGER trg_users_bump_token_version_on_password_change
BEFORE UPDATE OF password_hash ON auth.users
FOR EACH ROW
WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
EXECUTE FUNCTION auth.fn_bump_token_version_on_password_change();


-- ---------------------------------------------------------
-- limitar perfiles a 5
-- ---------------------------------------------------------
CREATE TRIGGER trg_limit_profiles_per_user
BEFORE INSERT ON auth.profiles
FOR EACH ROW
EXECUTE FUNCTION auth.fn_limit_profiles_per_user();


-- ---------------------------------------------------------
-- impedir borrar el último perfil
-- ---------------------------------------------------------
CREATE TRIGGER trg_prevent_delete_last_profile
BEFORE DELETE ON auth.profiles
FOR EACH ROW
EXECUTE FUNCTION auth.fn_prevent_delete_last_profile();


-- ---------------------------------------------------------
-- auditoría cambio de contraseña
-- ---------------------------------------------------------
CREATE TRIGGER trg_audit_password_change
AFTER UPDATE OF password_hash ON auth.users
FOR EACH ROW
WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
EXECUTE FUNCTION auth.fn_audit_password_change();


-- ---------------------------------------------------------
-- auditoría desactivación de cuenta
-- ---------------------------------------------------------
CREATE TRIGGER trg_audit_account_deactivation
AFTER UPDATE OF is_active ON auth.users
FOR EACH ROW
WHEN (OLD.is_active = TRUE AND NEW.is_active = FALSE)
EXECUTE FUNCTION auth.fn_audit_account_deactivation();




CREATE OR REPLACE FUNCTION auth.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_record_id TEXT;
BEGIN
    -- Usuario desde sesión
    BEGIN
        v_user_id := current_setting('app.current_user_id')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN

        v_record_id :=
            COALESCE(
                to_jsonb(NEW)->>'user_id',
                to_jsonb(NEW)->>'profile_id',
                to_jsonb(NEW)->>'token_id',
                to_jsonb(NEW)->>'verification_token_id'
            );

        INSERT INTO auth.audit_trail (
            table_name,
            operation,
            user_id,
            record_id,
            new_data
        )
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            v_user_id,
            v_record_id,
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN

        v_record_id :=
            COALESCE(
                to_jsonb(NEW)->>'user_id',
                to_jsonb(NEW)->>'profile_id',
                to_jsonb(NEW)->>'token_id',
                to_jsonb(NEW)->>'verification_token_id'
            );

        INSERT INTO auth.audit_trail (
            table_name,
            operation,
            user_id,
            record_id,
            old_data,
            new_data
        )
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            v_user_id,
            v_record_id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        v_record_id :=
            COALESCE(
                to_jsonb(OLD)->>'user_id',
                to_jsonb(OLD)->>'profile_id',
                to_jsonb(OLD)->>'token_id',
                to_jsonb(OLD)->>'verification_token_id'
            );

        INSERT INTO auth.audit_trail (
            table_name,
            operation,
            user_id,
            record_id,
            old_data
        )
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            v_user_id,
            v_record_id,
            to_jsonb(OLD)
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;



CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.fn_audit_trigger();


CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON auth.profiles
FOR EACH ROW
EXECUTE FUNCTION auth.fn_audit_trigger();


-- =========================================================
--  PROCEDIMIENTOS ALMACENADOS
-- =========================================================

-- ---------------------------------------------------------
-- Registro de usuario + perfil inicial + audit log
-- Compatible con:
-- CALL auth.sp_register_user($1, $2, $3, NULL, NULL, NULL, NULL)
-- ---------------------------------------------------------
CREATE OR REPLACE PROCEDURE auth.sp_register_user(
    IN  p_email VARCHAR,
    IN  p_password VARCHAR,
    IN  p_display_name VARCHAR,
    IN  p_oauth_provider VARCHAR,
    IN  p_oauth_sub VARCHAR,
    OUT p_user_id UUID,
    OUT p_profile_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validación mínima de modo de autenticación
    IF p_password IS NULL AND (p_oauth_provider IS NULL OR p_oauth_sub IS NULL) THEN
        RAISE EXCEPTION 'Debe proporcionar contraseña o credenciales OAuth válidas.';
    END IF;

    IF p_password IS NOT NULL AND (p_oauth_provider IS NOT NULL OR p_oauth_sub IS NOT NULL) THEN
        RAISE EXCEPTION 'No se puede registrar simultáneamente con contraseña y OAuth.';
    END IF;

    INSERT INTO auth.users (
        email,
        password_hash,
        oauth_provider,
        oauth_sub
    )
    VALUES (
        p_email,
        CASE
            WHEN p_password IS NOT NULL
                THEN public.crypt(p_password, public.gen_salt('bf', 12))
            ELSE NULL
        END,
        p_oauth_provider,
        p_oauth_sub
    )
    RETURNING user_id
    INTO p_user_id;

    INSERT INTO auth.profiles (
        user_id,
        display_name
    )
    VALUES (
        p_user_id,
        p_display_name
    )
    RETURNING profile_id
    INTO p_profile_id;

    INSERT INTO auth.audit_log(user_id, event_type, description)
    VALUES (
        p_user_id,
        'USER_REGISTERED',
        'Nuevo usuario registrado en la plataforma.'
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'El correo % ya está registrado.', p_email;
END;
$$;


-- ---------------------------------------------------------
-- Revoca todos los refresh tokens activos del usuario
-- Compatible con tu AuthRepository.revokeAllTokens(...)
-- ---------------------------------------------------------
CREATE OR REPLACE PROCEDURE auth.sp_revoke_all_tokens(
    IN p_user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE auth.refresh_tokens
    SET revoked = TRUE
    WHERE user_id = p_user_id
      AND revoked = FALSE;

    INSERT INTO auth.audit_log(user_id, event_type, description)
    VALUES (
        p_user_id,
        'ALL_TOKENS_REVOKED',
        'Todas las sesiones fueron cerradas.'
    );
END;
$$;



-- =========================================================
--  VISTAS
-- =========================================================

-- ---------------------------------------------------------
-- Resumen de usuario con perfiles
-- Compatible con getUserProfilesSummary()
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW auth.v_user_profiles_summary AS
SELECT
    u.user_id,
    u.email,
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
            )
            ORDER BY p.created_at
        ) FILTER (WHERE p.profile_id IS NOT NULL),
        '[]'::json
    ) AS profiles,
    COUNT(p.profile_id) AS profile_count
FROM auth.users u
LEFT JOIN auth.profiles p
       ON p.user_id = u.user_id
GROUP BY
    u.user_id,
    u.email,
    u.oauth_provider,
    u.is_active,
    u.created_at;


-- ---------------------------------------------------------
-- Sesiones activas
-- Compatible con un panel tipo "mis dispositivos"
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW auth.v_active_sessions AS
SELECT
    rt.token_id,
    rt.user_id,
    u.email,
    rt.device_info,
    rt.ip_address,
    rt.expires_at,
    rt.created_at AS session_started
FROM auth.refresh_tokens rt
JOIN auth.users u
  ON u.user_id = rt.user_id
WHERE rt.revoked = FALSE
  AND rt.expires_at > NOW();


COMMIT;