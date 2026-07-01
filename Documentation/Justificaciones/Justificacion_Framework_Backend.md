# Justificación de Framework Backend - Quetxal TV

El backend de Quetxal TV se implementó como un conjunto de servicios independientes. Para la capa de entrada HTTP y parte de los microservicios se utilizó NestJS con TypeScript; para servicios de alto rendimiento se utilizó Go con gRPC; y para servicios de apoyo se utilizó Python con gRPC.

## Decisión principal

La decisión central fue usar NestJS para el API Gateway porque proporciona una estructura modular basada en controladores, módulos, servicios e inyección de dependencias. Esto facilita separar responsabilidades y mantener una capa de entrada ordenada hacia los microservicios internos.

## ¿Por qué NestJS?

- Permite organizar el API Gateway por módulos funcionales.
- Facilita inyección de dependencias.
- Integra controladores HTTP y clientes gRPC.
- Tiene soporte directo para pruebas con Jest.
- Facilita la incorporación de middleware, autenticación, cookies y CORS.

## Evidencia de uso en código

### Dependencias del API Gateway

Ruta: `app/QuetxalTV/api-gateway/package.json`

```json
{
  "name": "quetxal-api-gateway",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "start:dev": "ts-node src/main.ts",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.14.4",
    "@grpc/proto-loader": "^0.7.15",
    "@nestjs/common": "^11.1.24",
    "@nestjs/core": "^11.1.24",
    "@nestjs/microservices": "^11.1.26",
    "@nestjs/platform-express": "^11.1.24",
    "cookie-parser": "^1.4.7",
    "dotenv": "^17.4.2",
    "jsonwebtoken": "^9.0.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.19.42",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.3"
  }
}
```

### Registro modular en NestJS

Ruta: `app/QuetxalTV/api-gateway/src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { HistorialModule } from './historial/historial.module';
import { HealthController } from './health.controller';
import { AuditModule } from './audit/audit.module';
import { DownloadModule } from './download/download.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [SubscriptionModule, FxModule, CatalogModule, AuthModule, HistorialModule, AuditModule, MetricsModule,DownloadModule],
  controllers: [HealthController],
})
export class AppModule {}
```

### Inicialización del API Gateway

Ruta: `app/QuetxalTV/api-gateway/src/main.ts`

```ts
import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics/metrics.service';
import { createObservabilityMiddleware } from './metrics/observability.middleware';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const metricsService = app.get(MetricsService);
  app.use(createObservabilityMiddleware(metricsService));


  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url === '/api') req.url = '/';
    else if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
  });


  app.enableCors({ origin: true, credentials: true });
```

### Controlador de métricas en NestJS

Ruta: `app/QuetxalTV/api-gateway/src/metrics/metrics.controller.ts`

```ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(this.metricsService.renderPrometheusMetrics());
  }
}
```

### Auth Service con NestJS

Ruta: `app/QuetxalTV/microservices/auth-service/auth-service/package.json`

```json
{
  "name": "auth-service",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build && cp -r src/proto dist/",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.14.4",
    "@grpc/proto-loader": "^0.8.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/microservices": "^11.1.24",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/schedule": "^6.1.3",
    "@nestjs/typeorm": "^11.0.1",
    "pg": "^8.21.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^1.0.0",
    "uuid": "^14.0.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/cron": "^2.0.1",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^7.0.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
```

### Servicio de negocio con inyección de dependencias

Ruta: `app/QuetxalTV/microservices/auth-service/auth-service/src/auth/auth.service.ts`

```ts
// src/auth/auth.service.ts

import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { JwtService } from '../JWT/jwt.service';
import { NotificationClient } from '../notification/notification.client';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ValidateTokenRequest,
  ValidateTokenResponse,
} from './auth.contract';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationClient: NotificationClient,
  ) {}

  // ─────────────────────────────────────────────
  //  REGISTRO
  // ─────────────────────────────────────────────
  async register(req: RegisterRequest): Promise<RegisterResponse> {
    console.log('MICROSERVICE REGISTER REQ=', JSON.stringify(req, null, 2));
console.log('displayName=', (req as any).displayName);
console.log('display_name=', (req as any).display_name);

    const exists = await this.authRepository.existsByEmail(req.email);
    if (exists) {
      throw new ConflictException('El correo ya está registrado.');
    }

    // El stored procedure crea usuario + perfil inicial + audit_log en una tx
    const { userId, profileId } = await this.authRepository.registerUser({
      email:       req.email,
      password:    req.password,
      displayName: req.displayName,
    });
    await this.authRepository.activateUser(userId);

    this.logger.log(`Usuario registrado: ${userId}`);

    // Cuando el Notification Service esté disponible, reemplazar este
  try {
      await this.notificationClient.sendWelcomeEmail({
        user_id:    userId,
        user_email: req.email,
        user_name:  req.displayName,
      });
    } catch (err: unknown) {
      this.logger.warn(`Email de bienvenida no enviado: ${(err as Error).message}`);
    }
   
    return {
      userId,
      profileId,
```

## Uso de Go y Python en backend

Aunque NestJS es clave en la capa de entrada y autenticación, el backend también integra Go y Python por necesidades específicas.

### Go para servicios de negocio

Ruta: `app/QuetxalTV/microservices/subscription-service/go.mod`

```go
module subscription-service

go 1.25.0

require (
	github.com/joho/godotenv v1.5.1
	github.com/jung-kurt/gofpdf v1.16.2
	github.com/lib/pq v1.10.9
	google.golang.org/grpc v1.81.1
	google.golang.org/protobuf v1.36.11
)

require (
	golang.org/x/net v0.51.0 // indirect
	golang.org/x/sys v0.42.0 // indirect
	golang.org/x/text v0.34.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260226221140-a57be14db171 // indirect
)
```

### Python para servicios de apoyo

Ruta: `app/QuetxalTV/microservices/historial-service/requirements.txt`

```
grpcio==1.64.1
grpcio-tools==1.64.1
grpcio-health-checking==1.64.1
protobuf==5.27.1
python-dotenv==1.0.1
psycopg2-binary==2.9.9
```

## Conclusión

NestJS fue seleccionado como framework backend principal para el API Gateway y servicios TypeScript porque ofrece estructura, modularidad e integración con gRPC y testing. Go y Python complementan la arquitectura para servicios donde se necesita rendimiento, simplicidad o integración rápida con librerías externas.
