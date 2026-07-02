-- SEED: Usa el SP para crear usuario + perfil en una sola transacción
DO $$
DECLARE
  v_user_id   UUID;
  v_profile_id UUID;
BEGIN
  CALL auth.sp_register_user(
    'admin@gmail.com',
    '12345678',
    'Admin',
    NULL, NULL,
    v_user_id, v_profile_id
  );

  -- Promover a admin y activar la cuenta (sin verificación de email en seed)
  UPDATE auth.users
     SET role = 'admin', is_active = TRUE
   WHERE user_id = v_user_id;

EXCEPTION WHEN unique_violation THEN
  NULL; -- ya existe, no hacer nada
END;
$$;
