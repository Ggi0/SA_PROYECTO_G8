
Gestionar identidad y acceso.

Maneja:
* Usuarios
* Perfiles
* Login
* Logout
* JWT
* OAuth
* Session Cookies
* Cambio de contraseña

Se comunica con
```
    Notification Service
```

para:
```
    Confirmación de registro
    Recuperación de contraseña
```

```
streaming-platform/
│
├── proto/
│
├── api-gateway/
│
├── auth-service/                  <-- NestJS | Puerto 50051 | TypeScript
│   ├── src/
│   │   ├── main.ts                <-- Levanta servidor gRPC, NO HTTP
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts <-- Implementa métodos gRPC del .proto
│   │   │   ├── auth.service.ts
│   │   │   └── auth.repository.ts
│   │   ├── profiles/
│   │   │   ├── profiles.module.ts
│   │   │   ├── profiles.controller.ts
│   │   │   └── profiles.service.ts
│   │   ├── common/
│   │   │   ├── jwt/
│   │   │   └── oauth/
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── stored-procedures/ <-- SQL de SPs, vistas, triggers
│   │   └── proto/                 <-- .proto compilados para TS
│   ├── Dockerfile
│   ├── .env
│   ├── package.json
│   └── tsconfig.json

```