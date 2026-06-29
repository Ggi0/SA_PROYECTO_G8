GetAllUserwithProfile


body
```
{
  "admin_user_id": "9c4f5f27-c461-4a6a-8774-b0c5e06cf58c"}




```


respuesta:
```json
{
    "users": [
        {
            "profiles": [
                {
                    "profile_id": "aaab2248-7ca4-43b7-9417-3f415ba3c21c",
                    "display_name": "gio2",
                    "avatar_url": "",
                    "is_kids_mode": false
                },
                {
                    "profile_id": "4c1b196b-6edd-4fd8-9bdd-c5307a62a052",
                    "display_name": "2",
                    "avatar_url": "",
                    "is_kids_mode": false
                },
                {
                    "profile_id": "d95c288d-8143-4cc7-a40e-963b40ad325d",
                    "display_name": "3",
                    "avatar_url": "",
                    "is_kids_mode": true
                }
            ],
            "user_id": "766abdde-e1ff-4403-8a46-cdb58f6b0d15",
            "email": "gio2@gmail.com",
            "role": "client",
            "is_active": true,
            "created_at": "2026-06-28T22:13:03.183Z",
            "updated_at": "2026-06-28T22:13:15.793Z",
            "last_login_at": "2026-06-28T22:13:15.791Z",
            "deactivated_at": "",
            "deactivation_reason": ""
        },
        {
            "profiles": [
                {
                    "profile_id": "42047981-e555-4609-80cf-b38c4bfafedd",
                    "display_name": "gio1",
                    "avatar_url": "",
                    "is_kids_mode": false
                },
                {
                    "profile_id": "c6d33fd7-62c0-4b1a-be81-c7e09997ffdb",
                    "display_name": "hola",
                    "avatar_url": "",
                    "is_kids_mode": true
                },
                {
                    "profile_id": "c43c8305-a015-4d0b-b3b0-e41f403f3c08",
                    "display_name": "perfil3",
                    "avatar_url": "",
                    "is_kids_mode": false
                }
            ],
            "user_id": "d6ba94bd-9d1c-4004-9509-03375e5054f3",
            "email": "gio1@gmail.com",
            "role": "client",
            "is_active": true,
            "created_at": "2026-06-28T22:11:51.790Z",
            "updated_at": "2026-06-28T22:12:03.669Z",
            "last_login_at": "2026-06-28T22:12:03.665Z",
            "deactivated_at": "",
            "deactivation_reason": ""
        },
        {
            "profiles": [],
            "user_id": "9c4f5f27-c461-4a6a-8774-b0c5e06cf58c",
            "email": "admin@gmail.com",
            "role": "admin",
            "is_active": true,
            "created_at": "2026-06-28T22:08:34.823Z",
            "updated_at": "2026-06-28T22:17:16.078Z",
            "last_login_at": "2026-06-28T22:17:16.077Z",
            "deactivated_at": "",
            "deactivation_reason": ""
        }
    ],
    "total": 3
}

```

# Get audit event logs
```json
{
  "admin_user_id": "9c4f5f27-c461-4a6a-8774-b0c5e06cf58c"
}
```


respuesta:
```json
{
    "logs": [
        {
            "log_id": "23",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:22:00.140Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:22:00.140Z"
        },
        {
            "log_id": "22",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:22:00.139Z"
        },
        {
            "log_id": "21",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:22:00.134Z"
        },
        {
            "log_id": "20",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:20:00.045Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:20:00.046Z"
        },
        {
            "log_id": "19",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:20:00.044Z"
        },
        {
            "log_id": "18",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:20:00.040Z"
        },
        {
            "log_id": "17",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:18:00.051Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:18:00.051Z"
        },
        {
            "log_id": "16",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:18:00.049Z"
        },
        {
            "log_id": "15",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:18:00.045Z"
        },
        {
            "log_id": "14",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:16:00.057Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:16:00.057Z"
        },
        {
            "log_id": "13",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:16:00.055Z"
        },
        {
            "log_id": "12",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:16:00.049Z"
        },
        {
            "log_id": "11",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:14:00.075Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:14:00.075Z"
        },
        {
            "log_id": "10",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:14:00.073Z"
        },
        {
            "log_id": "9",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:14:00.068Z"
        },
        {
            "log_id": "8",
            "user_id": "766abdde-e1ff-4403-8a46-cdb58f6b0d15",
            "event_type": "USER_REGISTERED",
            "description": "Nuevo usuario registrado en la plataforma.",
            "metadata": "{}",
            "created_at": "2026-06-28T22:13:03.183Z"
        },
        {
            "log_id": "7",
            "user_id": "",
            "event_type": "CRON_DEACTIVATION_BATCH",
            "description": "Batch de desactivación automática completado. Total: 2 cuenta(s).",
            "metadata": "{\"ejecutado_en\":\"2026-06-28T22:12:00.037Z\",\"umbral_minutos\":20,\"total_desactivadas\":2}",
            "created_at": "2026-06-28T22:12:00.037Z"
        },
        {
            "log_id": "6",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:12:00.035Z"
        },
        {
            "log_id": "5",
            "user_id": "",
            "event_type": "ACCOUNT_AUTO_DEACTIVATED",
            "description": "Cuenta desactivada automáticamente por inactividad de 20 minutos.",
            "metadata": "{\"motivo\":\"nunca_inicio_sesion\"}",
            "created_at": "2026-06-28T22:12:00.029Z"
        },
        {
            "log_id": "4",
            "user_id": "d6ba94bd-9d1c-4004-9509-03375e5054f3",
            "event_type": "USER_REGISTERED",
            "description": "Nuevo usuario registrado en la plataforma.",
            "metadata": "{}",
            "created_at": "2026-06-28T22:11:51.790Z"
        }
    ],
    "total_records": 23,
    "page": 1,
    "page_size": 20
}

```