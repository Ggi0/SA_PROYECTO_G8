ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_login ON auth.users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_deactivated ON auth.users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON auth.users(is_active);

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

-- Evita eliminar el ultimo perfil de un usuario.
CREATE OR REPLACE FUNCTION auth.fn_prevent_delete_last_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_active  BOOLEAN;
    v_cron_purge TEXT;
BEGIN
    BEGIN
        v_cron_purge := current_setting('app.cron_purge_active');
    EXCEPTION
        WHEN OTHERS THEN
            v_cron_purge := 'false';
    END;

    IF v_cron_purge = 'true' THEN
        RETURN OLD;
    END IF;

    SELECT is_active INTO v_is_active
    FROM auth.users WHERE user_id = OLD.user_id;

    IF v_is_active = FALSE THEN
        RETURN OLD;
    END IF;

    IF auth.fn_count_profiles(OLD.user_id) <= 1 THEN
        RAISE EXCEPTION 'No se puede eliminar el unico perfil del usuario.';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_last_profile ON auth.profiles;

CREATE TRIGGER trg_prevent_delete_last_profile
BEFORE DELETE ON auth.profiles
FOR EACH ROW
EXECUTE FUNCTION auth.fn_prevent_delete_last_profile();
