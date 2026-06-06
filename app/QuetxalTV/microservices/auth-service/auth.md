
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



Intrucciones:

* crear el proyecto:
```
    npm i -g @nestjs/cli
```


* crear el microsevicio (carpeta con structura)
```
    nest new auth-service
```

nota: paquete `Which package manager?`: npm


dentro del microservicio: `cd auth-service`, para las dependencias de gRPC:
```
npm install @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```


en `./auth-service/src/proto` agregar el contrato:
```
    auth.proto
```

creamos el modulo para auth:
```
    nest g module auth
    nest g service auth
    nest g controller auth
```

leuego de modificar los archivos necesarios ejecutar proyecto:
`npm run start`

```bash
gio@MacBook-Pro-de-Gio auth-service % npm run start

> auth-service@0.0.1 start
> nest start

[Nest] 7035  - 06/06/2026, 13:09:55     LOG [NestFactory] Starting Nest application...
[Nest] 7035  - 06/06/2026, 13:09:56     LOG [InstanceLoader] AppModule dependencies initialized +40ms
[Nest] 7035  - 06/06/2026, 13:09:56     LOG [InstanceLoader] AuthModule dependencies initialized +0ms
[Nest] 7035  - 06/06/2026, 13:09:56     LOG [NestMicroservice] Nest microservice successfully started +242ms
Login request: {}

```

probar el metodo.
