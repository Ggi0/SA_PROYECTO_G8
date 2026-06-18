--  SEED: Usuario Admin
INSERT INTO auth.users (
    email,
    password_hash,
    role,
    is_active
)
VALUES (
    'admin@gmail.com',
    public.crypt('12345678', public.gen_salt('bf', 12)),
    'admin',
    TRUE
);
