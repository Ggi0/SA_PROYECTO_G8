Sí, **exactamente ahí entra el JWT**: en una arquitectura con **database per service**, el JWT se vuelve el mecanismo para transportar la **identidad autenticada** y el **contexto mínimo de autorización** entre el API Gateway y los demás microservicios, **sin joins** y sin que cada servicio tenga que preguntarle a Auth quién es el usuario en cada request.

Y como quieres dejarlo **bien planteado para que a los demás no se les complique**, lo más importante no es solo “tener login”, sino definir un **contrato de autenticación consistente**.

Voy a dejarte esto como si fuera un mini documento de arquitectura + contrato API del **Auth Service**.

***

# 1) Primero: un ajuste importante a tu diseño del JWT

Tu idea va **muy bien**, pero te recomiendo una mejora clave:

## ❌ No metas `profiles[]` completo dentro del JWT

Aunque se puede, **no es lo ideal**.

### ¿Por qué?

* El token crece innecesariamente.
* Si el usuario crea/edita/elimina perfiles, el JWT queda **desactualizado**.
* Los otros microservicios **no necesitan** la lista completa de perfiles en cada request.

## ✅ Mejor práctica

El **JWT de access token** debe llevar solo el **contexto mínimo necesario**:

```json
{
  "sub": "user_id",
  "email": "user@email.com",
  "role": "USER",
  "active_profile_id": "uuid-del-perfil-seleccionado",
  "session_id": "uuid-o-jti",
  "token_version": 1,
  "iat": 1710000000,
  "exp": 1710003600
}
```

## Entonces, ¿dónde va la lista de perfiles?

En:

* la respuesta de `login`
* la respuesta de `GET /auth/profiles`
* o la respuesta de `GET /auth/me`

Así:

* JWT = identidad y contexto actual
* API = datos actualizables del usuario/perfiles

***

# 2) Qué funcionalidades mínimas debe cubrir tu Auth Service

Según tu proyecto, el mínimo serio debe cubrir:

## Autenticación

* Registro
* Login
* Refresh token
* Logout
* Logout global (todas las sesiones)
* OAuth login
* Selección de perfil activa

## Cuenta

* Ver datos de la cuenta autenticada
* Cambio de contraseña
* Recuperación de contraseña
* Reset de contraseña

## Perfiles

* Listar perfiles
* Crear perfil
* Editar perfil
* Eliminar perfil
* Seleccionar perfil activo

***

# 3) Separación correcta: REST externo vs gRPC interno

Tu **frontend NO habla directo con Auth Service**, habla con el **API Gateway**.

Entonces tú debes definir dos cosas:

## A. Endpoints REST del API Gateway

Esto es lo que consume el frontend.

## B. Métodos gRPC del Auth Service

Esto es lo que implementa el Auth Service internamente.

***

# 4) Contrato recomendado de identidad para los demás microservicios

Para simplificarle la vida a Catalog / Subscription / Playback, te recomiendo que el API Gateway, **después de validar el JWT**, pase estos metadatos gRPC a todos los servicios protegidos:

```text
x-user-id
x-user-email
x-user-role
x-active-profile-id
x-session-id
```

### Regla para todo el equipo:

Los demás microservicios:

* **NO consultan auth\_db**
* **NO llaman al Auth Service para saber quién es el usuario**
* usan únicamente el contexto ya validado por el Gateway

***

# 5) Estructura estándar de errores (usa la misma en todos los endpoints)

Te recomiendo este formato uniforme:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Correo o contraseña incorrectos.",
  "details": null,
  "timestamp": "2026-06-08T17:28:07-06:00",
  "path": "/auth/login"
}
```

## Campos sugeridos

* `statusCode`
* `error`
* `code` → código interno estable para frontend/backend
* `message`
* `details` → validaciones o contexto adicional
* `timestamp`
* `path`

***

# 6) Endpoints REST mínimos que sí necesitas

Voy a darte el set **mínimo completo**, no inflado, pero sí profesional.

***

***

## 6.1 `POST /auth/register`

Registra una cuenta y crea el perfil inicial.

### Request body

```json
{
  "email": "user@email.com",
  "password": "StrongPass123!",
  "display_name": "Mi Perfil"
}
```

### Validaciones

* email válido
* password obligatoria para registro local
* `display_name` obligatorio
* email único
* longitud password mínima recomendada: 8 o más

### Response `201 Created`

```json
{
  "message": "Usuario registrado correctamente.",
  "user": {
    "user_id": "4a7d7e6c-8a10-4b75-9e0c-1fc1b6a6ab11",
    "email": "user@email.com",
    "created_at": "2026-06-08T17:28:07-06:00"
  },
  "profiles": [
    {
      "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f",
      "display_name": "Mi Perfil",
      "avatar_url": null,
      "is_kids_mode": false
    }
  ]
}
```

### Errores

* `400 AUTH_VALIDATION_ERROR`
* `409 AUTH_EMAIL_ALREADY_REGISTERED`

### Notas

* Aquí **no necesariamente** tienes que loguear al usuario automáticamente.
* Puedes hacerlo de dos maneras:
  1. **register solo crea cuenta**
  2. **register + login automático**

Para simplificar, te recomiendo:
✅ **register solo crea cuenta**  
✅ luego el frontend llama `login`

***

## 6.2 `POST /auth/login`

Autentica con email/contraseña.

### Request body

```json
{
  "email": "user@email.com",
  "password": "StrongPass123!"
}
```

### Response `200 OK`

```json
{
  "message": "Login exitoso.",
  "access_token": "jwt-access-token",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "user_id": "4a7d7e6c-8a10-4b75-9e0c-1fc1b6a6ab11",
    "email": "user@email.com",
    "role": "USER"
  },
  "profiles": [
    {
      "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f",
      "display_name": "Juan",
      "avatar_url": null,
      "is_kids_mode": false
    },
    {
      "profile_id": "b60f31cf-7663-4cb3-84c1-602c4836c788",
      "display_name": "Kids",
      "avatar_url": null,
      "is_kids_mode": true
    }
  ],
  "active_profile_id": null
}
```

### Cookie

Además del body, el backend debe setear:

* **HttpOnly cookie** con refresh token  
  Ejemplo conceptual:

```text
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/auth/refresh
```

### Errores

* `401 AUTH_INVALID_CREDENTIALS`
* `403 AUTH_ACCOUNT_INACTIVE`

### Nota importante

Después del login, el usuario puede:

* o entrar con `active_profile_id = null`
* o el frontend forzar selección de perfil antes de seguir

✅ Para Netflix-style, esto está perfecto.

***

## 6.3 `POST /auth/refresh`

Renueva el access token usando el refresh token guardado en cookie.

### Request

Sin body, o con body vacío:

```json
{}
```

### Requiere

* cookie `refresh_token`

### Response `200 OK`

```json
{
  "access_token": "nuevo-access-token",
  "expires_in": 900,
  "token_type": "Bearer",
  "active_profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f"
}
```

### Errores

* `401 AUTH_REFRESH_TOKEN_MISSING`
* `401 AUTH_REFRESH_TOKEN_INVALID`
* `401 AUTH_REFRESH_TOKEN_REVOKED`
* `401 AUTH_REFRESH_TOKEN_EXPIRED`

***

## 6.4 `POST /auth/logout`

Cierra la sesión actual.

### Request

No necesita body si usa cookie:

```json
{}
```

### Qué hace

* revoca el refresh token actual
* limpia cookie

### Response `200 OK`

```json
{
  "message": "Sesión cerrada correctamente."
}
```

### Errores

* normalmente puede responder `200` incluso si la cookie ya no existe
* si quieres ser estricto: `401 AUTH_NOT_AUTHENTICATED`

***

## 6.5 `POST /auth/logout-all`

Cierra todas las sesiones del usuario.

### Auth requerida

Sí

### Request

```json
{}
```

### Response `200 OK`

```json
{
  "message": "Todas las sesiones fueron cerradas correctamente."
}
```

### Qué hace

Internamente puede usar tu:

```sql
CALL sp_revoke_all_tokens(p_user_id)
```

### Errores

* `401 AUTH_UNAUTHORIZED`

***

## 6.6 `GET /auth/me`

Devuelve información de la cuenta autenticada.

### Auth requerida

Sí

### Response `200 OK`

```json
{
  "user": {
    "user_id": "4a7d7e6c-8a10-4b75-9e0c-1fc1b6a6ab11",
    "email": "user@email.com",
    "role": "USER",
    "is_active": true,
    "member_since": "2026-06-01T10:00:00-06:00"
  },
  "active_profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f"
}
```

### Errores

* `401 AUTH_UNAUTHORIZED`

***

# 7) Gestión de perfiles

Estos son **obligatorios** para tu caso.

***

## 7.1 `GET /auth/profiles`

Lista todos los perfiles del usuario autenticado.

### Auth requerida

Sí

### Response `200 OK`

```json
{
  "profiles": [
    {
      "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f",
      "display_name": "Juan",
      "avatar_url": null,
      "preferences": {
        "language": "es",
        "maturity_rating": "PG-13"
      },
      "is_kids_mode": false,
      "created_at": "2026-06-01T10:00:00-06:00",
      "updated_at": "2026-06-02T12:00:00-06:00"
    }
  ],
  "count": 1,
  "max_allowed": 5
}
```

### Errores

* `401 AUTH_UNAUTHORIZED`

***

## 7.2 `POST /auth/profiles`

Crea un nuevo perfil.

### Auth requerida

Sí

### Request body

```json
{
  "display_name": "Kids",
  "avatar_url": "https://cdn.app/avatar-kids.png",
  "preferences": {
    "language": "es"
  },
  "is_kids_mode": true
}
```

### Response `201 Created`

```json
{
  "message": "Perfil creado correctamente.",
  "profile": {
    "profile_id": "b60f31cf-7663-4cb3-84c1-602c4836c788",
    "display_name": "Kids",
    "avatar_url": "https://cdn.app/avatar-kids.png",
    "preferences": {
      "language": "es"
    },
    "is_kids_mode": true,
    "created_at": "2026-06-08T17:28:07-06:00",
    "updated_at": "2026-06-08T17:28:07-06:00"
  }
}
```

### Errores

* `400 AUTH_PROFILE_VALIDATION_ERROR`
* `409 AUTH_PROFILE_LIMIT_REACHED`
* `401 AUTH_UNAUTHORIZED`

### Nota

Tu trigger ya protege el máximo de 5 perfiles. Excelente.

***

## 7.3 `PATCH /auth/profiles/:profileId`

Edita un perfil existente.

### Auth requerida

Sí

### Request body

```json
{
  "display_name": "Juan Adulto",
  "avatar_url": "https://cdn.app/avatar1.png",
  "preferences": {
    "language": "en",
    "maturity_rating": "R"
  },
  "is_kids_mode": false
}
```

### Response `200 OK`

```json
{
  "message": "Perfil actualizado correctamente.",
  "profile": {
    "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f",
    "display_name": "Juan Adulto",
    "avatar_url": "https://cdn.app/avatar1.png",
    "preferences": {
      "language": "en",
      "maturity_rating": "R"
    },
    "is_kids_mode": false,
    "updated_at": "2026-06-08T17:28:07-06:00"
  }
}
```

### Errores

* `404 AUTH_PROFILE_NOT_FOUND`
* `403 AUTH_PROFILE_NOT_OWNED`
* `400 AUTH_PROFILE_VALIDATION_ERROR`
* `401 AUTH_UNAUTHORIZED`

***

## 7.4 `DELETE /auth/profiles/:profileId`

Elimina un perfil.

### Auth requerida

Sí

### Regla recomendada

No permitir que el usuario elimine su **único perfil restante**.

### Response `200 OK`

```json
{
  "message": "Perfil eliminado correctamente."
}
```

### Errores

* `404 AUTH_PROFILE_NOT_FOUND`
* `403 AUTH_PROFILE_NOT_OWNED`
* `409 AUTH_CANNOT_DELETE_LAST_PROFILE`

***

## 7.5 `POST /auth/profiles/select`

Selecciona el perfil activo y emite nuevo JWT con `active_profile_id`.

### Auth requerida

Sí

### Request body

```json
{
  "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f"
}
```

### Qué hace

* verifica que el perfil pertenece al usuario autenticado
* genera nuevo access token con:

```json
{
  "sub": "user_id",
  "active_profile_id": "profile_id"
}
```

### Response `200 OK`

```json
{
  "message": "Perfil seleccionado correctamente.",
  "access_token": "nuevo-jwt-con-active-profile",
  "expires_in": 900,
  "token_type": "Bearer",
  "active_profile": {
    "profile_id": "ce94512e-44d3-4ac1-bd60-9fd9a8d1dc2f",
    "display_name": "Juan",
    "is_kids_mode": false
  }
}
```

### Errores

* `404 AUTH_PROFILE_NOT_FOUND`
* `403 AUTH_PROFILE_NOT_OWNED`
* `401 AUTH_UNAUTHORIZED`

***

# 8) Contraseña y recuperación

***

## 8.1 `PATCH /auth/password/change`

Cambiar contraseña estando autenticado.

### Auth requerida

Sí

### Request body

```json
{
  "current_password": "OldPass123!",
  "new_password": "NewStrongPass456!"
}
```

### Response `200 OK`

```json
{
  "message": "Contraseña actualizada correctamente."
}
```

### Qué debe pasar además

* invalidar refresh tokens existentes (o todos)
* obligar re-login si así lo decides

### Errores

* `400 AUTH_PASSWORD_WEAK`
* `401 AUTH_INVALID_CURRENT_PASSWORD`
* `401 AUTH_UNAUTHORIZED`

***

## 8.2 `POST /auth/password/forgot`

Solicita recuperación de contraseña.

### Request body

```json
{
  "email": "user@email.com"
}
```

### Response `200 OK`

```json
{
  "message": "Si el correo existe, se enviaron instrucciones de recuperación."
}
```

### Importante

Nunca reveles si el correo existe o no.

### Errores

* normalmente siempre responder `200`
* si el formato del correo es inválido: `400 AUTH_VALIDATION_ERROR`

***

## 8.3 `POST /auth/password/reset`

Restablece contraseña usando token de recuperación.

### Request body

```json
{
  "reset_token": "token-seguro",
  "new_password": "NewStrongPass456!"
}
```

### Response `200 OK`

```json
{
  "message": "Contraseña restablecida correctamente."
}
```

### Errores

* `400 AUTH_RESET_TOKEN_INVALID`
* `400 AUTH_RESET_TOKEN_EXPIRED`
* `400 AUTH_PASSWORD_WEAK`

> **Importante de diseño:** tu BD actual todavía no tiene una tabla para reset tokens.  
> Para soportar esto bien, te conviene agregar algo como:

```sql
CREATE TABLE password_reset_tokens (
    reset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

***

# 9) OAuth mínimo necesario

Si tu proyecto exige OAuth, al mínimo necesitas estos endpoints.

***

## 9.1 `GET /auth/oauth/:provider`

Redirige al proveedor (`google`, por ejemplo).

### Response

* redirección `302`

O si prefieres SPA:

```json
{
  "authorization_url": "https://accounts.google.com/..."
}
```

### Errores

* `400 AUTH_OAUTH_PROVIDER_NOT_SUPPORTED`

***

## 9.2 `GET /auth/oauth/:provider/callback`

Procesa el callback del proveedor.

### Qué hace

* valida `code`
* obtiene perfil del proveedor
* busca o crea usuario local
* emite access token
* setea refresh token cookie

### Response `200 OK`

```json
{
  "message": "OAuth login exitoso.",
  "access_token": "jwt-access-token",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "user_id": "uuid",
    "email": "user@email.com",
    "role": "USER"
  },
  "profiles": [
    {
      "profile_id": "uuid",
      "display_name": "Mi Perfil",
      "is_kids_mode": false
    }
  ],
  "active_profile_id": null
}
```

### Errores

* `400 AUTH_OAUTH_INVALID_CODE`
* `400 AUTH_OAUTH_PROVIDER_NOT_SUPPORTED`
* `401 AUTH_OAUTH_AUTHENTICATION_FAILED`

***

# 10) Endpoints mínimos finales que yo sí dejaría oficialmente

Si quieres el conjunto **mínimo realista y suficiente**, yo documentaría estos 13:

## Públicos

1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/refresh`
4. `POST /auth/logout`
5. `POST /auth/password/forgot`
6. `POST /auth/password/reset`
7. `GET /auth/oauth/:provider`
8. `GET /auth/oauth/:provider/callback`

## Protegidos

9. `GET /auth/me`
10. `POST /auth/logout-all`
11. `GET /auth/profiles`
12. `POST /auth/profiles`
13. `PATCH /auth/profiles/:profileId`
14. `DELETE /auth/profiles/:profileId`
15. `POST /auth/profiles/select`
16. `PATCH /auth/password/change`

Si tu catedrático te pide “lo mínimo-mínimo”, podrías reducirlo a:

* register
* login
* refresh
* logout
* get profiles
* create profile
* update profile
* delete profile
* select profile
* forgot/reset password
* change password
* me

***

# 11) gRPC methods equivalentes del Auth Service

Internamente, el Auth Service podría exponer algo así:

```proto
service AuthService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc RefreshToken(RefreshTokenRequest) returns (RefreshTokenResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
  rpc LogoutAll(LogoutAllRequest) returns (LogoutAllResponse);

  rpc GetMe(GetMeRequest) returns (GetMeResponse);

  rpc ListProfiles(ListProfilesRequest) returns (ListProfilesResponse);
  rpc CreateProfile(CreateProfileRequest) returns (CreateProfileResponse);
  rpc UpdateProfile(UpdateProfileRequest) returns (UpdateProfileResponse);
  rpc DeleteProfile(DeleteProfileRequest) returns (DeleteProfileResponse);
  rpc SelectProfile(SelectProfileRequest) returns (SelectProfileResponse);

  rpc ChangePassword(ChangePasswordRequest) returns (ChangePasswordResponse);
  rpc ForgotPassword(ForgotPasswordRequest) returns (ForgotPasswordResponse);
  rpc ResetPassword(ResetPasswordRequest) returns (ResetPasswordResponse);

  rpc GetOAuthUrl(GetOAuthUrlRequest) returns (GetOAuthUrlResponse);
  rpc HandleOAuthCallback(HandleOAuthCallbackRequest) returns (HandleOAuthCallbackResponse);
}
```

***

# 12) Reglas que debes dejar escritas para TODO el equipo

Te recomiendo documentarlas tal cual:

## Regla 1

El **API Gateway valida el JWT** antes de enviar request a microservicios.

## Regla 2

Los microservicios consumen identidad desde metadatos:

```text
x-user-id
x-user-role
x-active-profile-id
```

## Regla 3

Ningún microservicio consulta `auth_db`.

## Regla 4

Si una operación requiere contexto de perfil (ej. Playback), debe exigir `active_profile_id`.

## Regla 5

Si una operación solo requiere contexto de cuenta (ej. Subscription), basta `user_id`.

***

# 13) Mi recomendación final sobre tu base de datos

Tu esquema va **bastante bien**, pero para que soporte completo lo que quieres, yo sí agregaría:

## A. Campo de rol en `users`

Ahora mismo no lo tienes.

```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'
CHECK (role IN ('USER', 'ADMIN'));
```

## B. Tabla de reset de contraseña

Porque si no, `forgot/reset password` queda incompleto.

## C. Idealmente `jti` o `session_id` por token

Para trazabilidad y control fino de sesiones.

***

# 14) Conclusión clara

Sí:  
**el JWT es la pieza que sustituye los joins de identidad/autorización entre microservicios**.

Y para que los demás servicios no sufran:

* JWT corto
* `user_id` y `active_profile_id` bien definidos
* Gateway valida una vez
* microservicios reciben metadata clara
* perfiles se manejan por endpoints específicos, no metiendo todo en el token

***

Si quieres, en el siguiente mensaje te lo puedo dejar **ya en formato de documentación técnica formal**, así:

## `Auth API Spec`

con:

* endpoint
* método
* auth requerida
* request DTO
* response DTO
* códigos HTTP
* errores por endpoint

o incluso te lo puedo dejar **en Swagger/OpenAPI YAML o JSON** para que prácticamente ya lo pases al proyecto.































# PROYECTO: PLATAFORMA DE STREAMING DISTRIBUIDA (MICROSERVICIOS)

## Descripción general

Este proyecto implementa una plataforma de streaming estilo Netflix basada en arquitectura de microservicios.

El objetivo es demostrar:

* Arquitectura de microservicios
* Backend políglota (TypeScript, Go, Python)
* Comunicación interna con gRPC
* API Gateway como punto único de entrada
* Bases de datos independientes por servicio (Database per Service)
* Uso de JWT para autenticación y autorización
* Redis como cache
* PostgreSQL con objetos avanzados (procedimientos, funciones, vistas, triggers)
* Despliegue con Docker y Google Cloud

***

## Arquitectura general

Flujo principal:

Frontend → API Gateway → Microservicios → Base de datos individual

Servicios:

* Auth Service (usuarios, login, perfiles)
* Catalog Service (contenido)
* Subscription Service (pagos)
* Playback Service (progreso)
* FX Service (divisas)
* Notification Service (emails)

Reglas clave:

* Cada servicio tiene su propia base de datos
* No existen foreign keys entre servicios
* No hay acceso directo entre bases de datos
* Toda comunicación entre servicios es gRPC
* El frontend solo habla con el API Gateway

***

## Problema que resuelve el JWT

Debido a que no hay joins entre bases de datos, los microservicios no pueden consultar datos de usuarios directamente.

Solución:

El JWT transporta la identidad del usuario y el contexto necesario en cada request.

Esto elimina la necesidad de:

* consultas cruzadas entre servicios
* llamadas constantes al Auth Service

***

# DISEÑO DE JWT

El access token debe ser corto y contener solo lo necesario.

Estructura recomendada:

```json
{
  "sub": "user_id",
  "email": "user@email.com",
  "role": "USER",
  "active_profile_id": "profile_id",
  "session_id": "uuid",
  "token_version": 1,
  "iat": 1710000000,
  "exp": 1710003600
}
```

Reglas:

* No incluir lista completa de perfiles
* El JWT representa identidad, no datos dinámicos
* active\_profile\_id define el contexto de uso
* Los perfiles se obtienen mediante endpoints, no del token

***

# VALIDACIÓN DE JWT

Se realiza en dos niveles:

1. API Gateway (principal)
   * valida firma
   * valida expiración
   * extrae payload

2. Microservicios (opcional pero recomendado)
   * validación defensiva

El API Gateway pasa la identidad como metadata gRPC:

```text
x-user-id
x-user-email
x-user-role
x-active-profile-id
x-session-id
```

Regla global:

Los microservicios NO deben consultar auth\_db ni llamar al Auth Service para validar identidad.

***

# AUTHSERVICE

## Responsabilidad

Gestionar:

* autenticación
* sesiones
* perfiles de usuario
* recuperación de cuenta

## Funcionalidades principales

Autenticación:

* registro
* login
* refresh token
* logout
* logout all

Cuenta:

* obtener info del usuario
* cambiar contraseña
* recuperar contraseña

Perfiles:

* listar perfiles
* crear perfil
* editar perfil
* eliminar perfil
* seleccionar perfil activo

***

# ENDPOINTS REST (expuestos por API Gateway)

## Públicos

### POST /auth/register

Request:

```json
{
  "email": "user@email.com",
  "password": "12345678",
  "display_name": "Perfil"
}
```

Response:

```json
{
  "message": "Usuario registrado correctamente",
  "user": { "user_id": "...", "email": "..." },
  "profiles": [...]
}
```

Errores:

* AUTH\_VALIDATION\_ERROR
* AUTH\_EMAIL\_ALREADY\_REGISTERED

***

### POST /auth/login

Request:

```json
{
  "email": "user@email.com",
  "password": "12345678"
}
```

Response:

```json
{
  "access_token": "...",
  "expires_in": 900,
  "user": { "user_id": "...", "email": "...", "role": "USER" },
  "profiles": [...],
  "active_profile_id": null
}
```

Además:

* se setea refresh token en cookie HttpOnly

Errores:

* AUTH\_INVALID\_CREDENTIALS
* AUTH\_ACCOUNT\_INACTIVE

***

### POST /auth/refresh

Response:

```json
{
  "access_token": "...",
  "expires_in": 900,
  "active_profile_id": "..."
}
```

Errores:

* AUTH\_REFRESH\_TOKEN\_INVALID
* AUTH\_REFRESH\_TOKEN\_EXPIRED

***

### POST /auth/logout

Response:

```json
{
  "message": "Sesión cerrada"
}
```

***

### POST /auth/password/forgot

Request:

```json
{
  "email": "user@email.com"
}
```

Response:

```json
{
  "message": "Si el correo existe, se enviaron instrucciones"
}
```

***

### POST /auth/password/reset

Request:

```json
{
  "reset_token": "...",
  "new_password": "newpass"
}
```

Response:

```json
{
  "message": "Contraseña actualizada"
}
```

***

## Protegidos (requieren JWT)

### GET /auth/me

Response:

```json
{
  "user": { "user_id": "...", "email": "...", "role": "USER" },
  "active_profile_id": "..."
}
```

***

### POST /auth/logout-all

Response:

```json
{
  "message": "Todas las sesiones cerradas"
}
```

***

### GET /auth/profiles

Response:

```json
{
  "profiles": [...],
  "count": 2,
  "max_allowed": 5
}
```

***

### POST /auth/profiles

Request:

```json
{
  "display_name": "Kids",
  "is_kids_mode": true
}
```

Response:

```json
{
  "profile": {...}
}
```

Errores:

* AUTH\_PROFILE\_LIMIT\_REACHED

***

### PATCH /auth/profiles/:id

Actualiza un perfil

Errores:

* AUTH\_PROFILE\_NOT\_FOUND
* AUTH\_PROFILE\_NOT\_OWNED

***

### DELETE /auth/profiles/:id

Respuesta:

```json
{
  "message": "Perfil eliminado"
}
```

Errores:

* AUTH\_CANNOT\_DELETE\_LAST\_PROFILE

***

### POST /auth/profiles/select

Request:

```json
{
  "profile_id": "..."
}
```

Response:

```json
{
  "access_token": "...",
  "active_profile": { ... }
}
```

Esto genera un nuevo JWT con active\_profile\_id.

***

### PATCH /auth/password/change

Request:

```json
{
  "current_password": "...",
  "new_password": "..."
}
```

Response:

```json
{
  "message": "Contraseña actualizada"
}
```

***

# gRPC CONTRATO DEL AUTHSERVICE

Internamente el Auth Service expone:

```proto
service AuthService {
  rpc Register(...)
  rpc Login(...)
  rpc RefreshToken(...)
  rpc Logout(...)
  rpc LogoutAll(...)
  rpc GetMe(...)

  rpc ListProfiles(...)
  rpc CreateProfile(...)
  rpc UpdateProfile(...)
  rpc DeleteProfile(...)
  rpc SelectProfile(...)

  rpc ChangePassword(...)
  rpc ForgotPassword(...)
  rpc ResetPassword(...)
}
```

***

# REGLAS PARA OTROS MICROSERVICIOS

1. Nunca consultar auth\_db
2. Nunca llamar a Auth Service para validar usuario
3. Usar datos del JWT propagados por el Gateway
4. Usar user\_id para operaciones de cuenta
5. Usar active\_profile\_id para operaciones de contenido

***

# CONCLUSIÓN

* El JWT reemplaza los joins entre servicios
* El API Gateway centraliza la autenticación
* Los microservicios son independientes
* El Auth Service es la única fuente de identidad
* El sistema es desacoplado, escalable y mantenible

***

Si quieres, siguiente paso te puedo dar:

* auth.proto completo ya listo para copiar
* estructura de carpetas NestJS Auth Service
* implementación real de JWT + guards en Gateway

solo dime qué quieres construir ahora.


# ACTUALIZACIÓN DEL FLUJO DE AUTENTICACIÓN Y PERFILES

## Responsabilidades de Auth Service

Gestionar:

* autenticación
* sesiones
* perfiles de usuario
* recuperación de cuenta
* emisión y renovación de JWT
* coordinación con otros microservicios relacionados con usuarios

---

# FLUJO DE REGISTRO

El registro es una operación distribuida.

El Auth Service es el punto de entrada, pero puede requerir coordinación con otros servicios.

Flujo general:

```text
Frontend
    ↓
API Gateway
    ↓
Auth Service
    ↓
(Validaciones locales)
    ↓
[ Futuro ] Llamada gRPC a otros servicios
    ↓
Persistencia en auth_db
    ↓
Generación de respuesta
```

### Flujo detallado

```text
1. Usuario envía registro

POST /auth/register

2. Auth Service valida:
   - formato de email
   - longitud de contraseña
   - unicidad del correo

3. Auth Service crea usuario y perfil inicial

4. [INTEGRACIÓN FUTURA]
   Auth Service podrá invocar otros microservicios vía gRPC:

   Notification Service
       → envío de correo de bienvenida

   Subscription Service
       → creación de suscripción gratuita inicial

   Analytics Service
       → evento de nuevo usuario

5. Si todas las operaciones requeridas son exitosas:

   - se confirma la transacción
   - se devuelve la respuesta al Gateway

6. Gateway responde al Frontend
```

### Consideraciones

Actualmente las llamadas gRPC externas NO están implementadas.

La arquitectura debe dejar preparado un cliente gRPC para futuras integraciones.

La ausencia temporal de dichos servicios NO debe impedir el registro.

---

# FLUJO DE LOGIN

```text
Frontend
    ↓
API Gateway
    ↓
Auth Service
    ↓
Validar credenciales
    ↓
Generar Access Token
    ↓
Generar Refresh Token
    ↓
Guardar Refresh Token
    ↓
Respuesta
```

Response:

```json
{
  "access_token": "...",
  "expires_in": 900,
  "user": {
    "user_id": "...",
    "email": "...",
    "role": "USER"
  },
  "profiles": [...],
  "active_profile_id": null
}
```

---

# FLUJO DE ACTIVACIÓN DE PERFIL

El usuario puede poseer múltiples perfiles.

El perfil activo define el contexto de consumo.

### Endpoint

POST /auth/profiles/select

Request:

```json
{
  "profile_id": "..."
}
```

### Flujo

```text
Usuario autenticado
    ↓
Selecciona perfil
    ↓
Auth Service valida:

- perfil existe
- perfil pertenece al usuario

    ↓
Genera nuevo JWT
    ↓
Actualiza active_profile_id
    ↓
Devuelve nuevo access token
```

### JWT anterior

```json
{
  "sub": "user_id",
  "email": "user@email.com",
  "role": "USER",
  "active_profile_id": null
}
```

### JWT nuevo

```json
{
  "sub": "user_id",
  "email": "user@email.com",
  "role": "USER",
  "active_profile_id": "profile_id"
}
```

Response:

```json
{
  "access_token": "...",
  "active_profile": {
    "profile_id": "...",
    "display_name": "Kids"
  }
}
```

---

# FLUJO DE REFRESH TOKEN

```text
Frontend
    ↓
Refresh Token Cookie
    ↓
API Gateway
    ↓
Auth Service
    ↓
Validar refresh token
    ↓
Validar sesión activa
    ↓
Generar nuevo JWT
    ↓
Respuesta
```

---

# FLUJO DE LOGOUT

```text
Frontend
    ↓
API Gateway
    ↓
Auth Service
    ↓
Revocar refresh token
    ↓
Eliminar cookie
    ↓
Respuesta
```

---

# FLUJO DE LOGOUT GLOBAL

```text
Frontend
    ↓
API Gateway
    ↓
Auth Service
    ↓
Revocar todos los refresh tokens
    ↓
Cerrar todas las sesiones
```

---

# FLUJO DE RECUPERACIÓN DE CONTRASEÑA

## Solicitar recuperación

POST /auth/password/forgot

```text
Usuario envía correo
    ↓
Auth Service
    ↓
Generar token temporal
    ↓
Guardar token
    ↓
[ Futuro ] Notification Service
    ↓
Enviar correo
```

---

## Restablecer contraseña

POST /auth/password/reset

```text
Usuario envía token
    ↓
Auth Service
    ↓
Validar token
    ↓
Actualizar contraseña
    ↓
Revocar sesiones activas
    ↓
Respuesta
```

---

# INTEGRACIONES gRPC FUTURAS

Actualmente el Auth Service expone gRPC.

Posteriormente también consumirá otros servicios.

## Notification Service

Responsabilidades:

* correo de bienvenida
* recuperación de contraseña
* notificaciones de seguridad

gRPC futuro:

```proto
service NotificationService {
  rpc SendWelcomeEmail(...)
  rpc SendPasswordReset(...)
}
```

---

## Subscription Service

Responsabilidades:

* crear plan gratuito inicial
* consultar estado de suscripción

gRPC futuro:

```proto
service SubscriptionService {
  rpc CreateTrialSubscription(...)
}
```

---

# REGLA DE DISEÑO

Auth Service es dueño de:

* usuarios
* credenciales
* JWT
* refresh tokens
* perfiles

Otros servicios nunca modifican estos datos directamente.

Toda interacción debe realizarse mediante gRPC.




src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   ├── auth.module.ts
│   ├── auth.contract.ts
│
├── perfil/
│   ├── perfil.controller.ts
│   ├── perfil.service.ts
│   ├── perfil.repository.ts
│   ├── perfil.module.ts
│   ├── perfil.contract.ts
│
├── database/
│   └── database.module.ts
│
├── proto/
│   └── auth.proto
│
├── common/
│   └── constants.ts
│
├── JWT/
│   └──  jwt.service.ts
│
├── app.module.ts
└── main.ts