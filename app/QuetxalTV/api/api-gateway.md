(app) streaming-platform/
│
├── proto/    
│
├── api-gateway/                    <-- NestJS | Puerto 3000 | TypeScript
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/                   <-- Módulo que proxea a auth-service
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts  <-- Recibe HTTP, llama gRPC
│   │   │   └── auth.service.ts     <-- Cliente gRPC de auth
│   │   ├── catalog/
│   │   │   ├── catalog.module.ts
│   │   │   ├── catalog.controller.ts
│   │   │   └── catalog.service.ts
│   │   ├── subscription/
│   │   ├── history/
│   │   ├── fx/
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   └── jwt.guard.ts    <-- Valida JWT en cada request
│   │   │   ├── interceptors/
│   │   │   └── decorators/
│   │   └── proto/                  <-- Archivos .proto compilados para TS (generados)
│   ├── Dockerfile
│   ├── .env
│   ├── package.json
│   └── tsconfig.json