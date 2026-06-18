
# 2 enpoints:


http://localhost:3000/auth/admin/audit

body: nada lo saca todo del JWT `app/QuetxalTV/api-gateway/src/common/guards/auth-jwt.guard.ts`

respuesta:
```
{
    "logs": [
        {
            "auditId": "4",
            "tableName": "users",
            "operation": "UPDATE",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.680Z",
            "oldData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}",
            "newData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.680991+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "2",
            "tableName": "users",
            "operation": "INSERT",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.421Z",
            "oldData": "",
            "newData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "3",
            "tableName": "profiles",
            "operation": "INSERT",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.421Z",
            "oldData": "",
            "newData": "{\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"avatar_url\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"profile_id\":\"0ca855bf-4f83-4e05-a18f-7ccb037c4bbe\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"preferences\":{},\"display_name\":\"\",\"is_kids_mode\":false}"
        },
        {
            "auditId": "1",
            "tableName": "users",
            "operation": "INSERT",
            "recordId": "fb9feb2f-acc5-457b-8e03-6a0399ab927f",
            "changedAt": "2026-06-17T21:19:33.287Z",
            "oldData": "",
            "newData": "{\"role\":\"admin\",\"email\":\"admin@gmail.com\",\"user_id\":\"fb9feb2f-acc5-457b-8e03-6a0399ab927f\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:19:33.287463+00:00\",\"updated_at\":\"2026-06-17T21:19:33.287463+00:00\",\"password_hash\":\"$2a$12$QJQiVPvdGvdHuvbzoNbszOCrxJtanoL9g0quYkdS0wEVhTwidRZjO\",\"token_version\":1,\"oauth_provider\":null}"
        }
    ],
    "totalRecords": 4,
    "page": 1,
    "pageSize": 20
}
```


## otro ejemplo:
```
{
    "logs": [
        {
            "auditId": "8",
            "tableName": "profiles",
            "operation": "INSERT",
            "recordId": "154a9e0a-c490-412e-ad82-b35436391090",
            "changedAt": "2026-06-17T21:38:54.694Z",
            "oldData": "",
            "newData": "{\"user_id\":\"154a9e0a-c490-412e-ad82-b35436391090\",\"avatar_url\":\"\",\"created_at\":\"2026-06-17T21:38:54.694371+00:00\",\"profile_id\":\"d399bdcb-59e9-4a31-b8c3-a4251aa3a499\",\"updated_at\":\"2026-06-17T21:38:54.694371+00:00\",\"preferences\":{},\"display_name\":\"Auditoria-test\",\"is_kids_mode\":false}"
        },
        {
            "auditId": "7",
            "tableName": "users",
            "operation": "UPDATE",
            "recordId": "154a9e0a-c490-412e-ad82-b35436391090",
            "changedAt": "2026-06-17T21:37:19.110Z",
            "oldData": "{\"role\":\"client\",\"email\":\"gc@gmail.com\",\"user_id\":\"154a9e0a-c490-412e-ad82-b35436391090\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:37:18.786913+00:00\",\"updated_at\":\"2026-06-17T21:37:18.786913+00:00\",\"password_hash\":\"$2a$12$syvzfINRAyssJNbv44nz2.DjLNfK6Z.UHxWYaZgkYZA3.01JWvI8K\",\"token_version\":1,\"oauth_provider\":null}",
            "newData": "{\"role\":\"client\",\"email\":\"gc@gmail.com\",\"user_id\":\"154a9e0a-c490-412e-ad82-b35436391090\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:37:18.786913+00:00\",\"updated_at\":\"2026-06-17T21:37:19.110567+00:00\",\"password_hash\":\"$2a$12$syvzfINRAyssJNbv44nz2.DjLNfK6Z.UHxWYaZgkYZA3.01JWvI8K\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "5",
            "tableName": "users",
            "operation": "INSERT",
            "recordId": "154a9e0a-c490-412e-ad82-b35436391090",
            "changedAt": "2026-06-17T21:37:18.786Z",
            "oldData": "",
            "newData": "{\"role\":\"client\",\"email\":\"gc@gmail.com\",\"user_id\":\"154a9e0a-c490-412e-ad82-b35436391090\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:37:18.786913+00:00\",\"updated_at\":\"2026-06-17T21:37:18.786913+00:00\",\"password_hash\":\"$2a$12$syvzfINRAyssJNbv44nz2.DjLNfK6Z.UHxWYaZgkYZA3.01JWvI8K\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "6",
            "tableName": "profiles",
            "operation": "INSERT",
            "recordId": "154a9e0a-c490-412e-ad82-b35436391090",
            "changedAt": "2026-06-17T21:37:18.786Z",
            "oldData": "",
            "newData": "{\"user_id\":\"154a9e0a-c490-412e-ad82-b35436391090\",\"avatar_url\":null,\"created_at\":\"2026-06-17T21:37:18.786913+00:00\",\"profile_id\":\"6bf4cb08-aaab-4c20-bc8f-ec5773239896\",\"updated_at\":\"2026-06-17T21:37:18.786913+00:00\",\"preferences\":{},\"display_name\":\"gioAudit\",\"is_kids_mode\":false}"
        },
        {
            "auditId": "4",
            "tableName": "users",
            "operation": "UPDATE",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.680Z",
            "oldData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}",
            "newData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.680991+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "2",
            "tableName": "users",
            "operation": "INSERT",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.421Z",
            "oldData": "",
            "newData": "{\"role\":\"client\",\"email\":\"gconcohacax21@gmail.com\",\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"password_hash\":\"$2a$12$6KIKGMYnC.Coy7Qbi5byLOd1IqT4uZPBxVdwpw.tqfdWvOKP7TIUW\",\"token_version\":1,\"oauth_provider\":null}"
        },
        {
            "auditId": "3",
            "tableName": "profiles",
            "operation": "INSERT",
            "recordId": "4da06d06-3de9-41cc-b29f-1c2769668662",
            "changedAt": "2026-06-17T21:20:24.421Z",
            "oldData": "",
            "newData": "{\"user_id\":\"4da06d06-3de9-41cc-b29f-1c2769668662\",\"avatar_url\":null,\"created_at\":\"2026-06-17T21:20:24.421254+00:00\",\"profile_id\":\"0ca855bf-4f83-4e05-a18f-7ccb037c4bbe\",\"updated_at\":\"2026-06-17T21:20:24.421254+00:00\",\"preferences\":{},\"display_name\":\"\",\"is_kids_mode\":false}"
        },
        {
            "auditId": "1",
            "tableName": "users",
            "operation": "INSERT",
            "recordId": "fb9feb2f-acc5-457b-8e03-6a0399ab927f",
            "changedAt": "2026-06-17T21:19:33.287Z",
            "oldData": "",
            "newData": "{\"role\":\"admin\",\"email\":\"admin@gmail.com\",\"user_id\":\"fb9feb2f-acc5-457b-8e03-6a0399ab927f\",\"is_active\":true,\"oauth_sub\":null,\"created_at\":\"2026-06-17T21:19:33.287463+00:00\",\"updated_at\":\"2026-06-17T21:19:33.287463+00:00\",\"password_hash\":\"$2a$12$QJQiVPvdGvdHuvbzoNbszOCrxJtanoL9g0quYkdS0wEVhTwidRZjO\",\"token_version\":1,\"oauth_provider\":null}"
        }
    ],
    "totalRecords": 8,
    "page": 1,
    "pageSize": 20
}

```


# 2do http://localhost:3000/auth/admin/audit/export

para export, honestamente no se como funciona muy bien este pero devuelve esto:

en el body nada, igual con el JWT

```
audit_id,table_name,operation,user_id,record_id,changed_at
8,profiles,INSERT,,154a9e0a-c490-412e-ad82-b35436391090,2026-06-17T21:38:54.694Z
7,users,UPDATE,,154a9e0a-c490-412e-ad82-b35436391090,2026-06-17T21:37:19.110Z
5,users,INSERT,,154a9e0a-c490-412e-ad82-b35436391090,2026-06-17T21:37:18.786Z
6,profiles,INSERT,,154a9e0a-c490-412e-ad82-b35436391090,2026-06-17T21:37:18.786Z
4,users,UPDATE,,4da06d06-3de9-41cc-b29f-1c2769668662,2026-06-17T21:20:24.680Z
2,users,INSERT,,4da06d06-3de9-41cc-b29f-1c2769668662,2026-06-17T21:20:24.421Z
3,profiles,INSERT,,4da06d06-3de9-41cc-b29f-1c2769668662,2026-06-17T21:20:24.421Z
1,users,INSERT,,fb9feb2f-acc5-457b-8e03-6a0399ab927f,2026-06-17T21:19:33.287Z
```

# para health 
estos solo para documentar

### http://localhost:3000/auth/health/live
```
{
    "status": "OK",
    "message": "Service is alive"
}
```


### http://localhost:3000/auth/health/ready
```
{
    "status": "OK",
    "message": "Service is ready (DB connected)"
}

```