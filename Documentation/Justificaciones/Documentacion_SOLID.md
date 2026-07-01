# Documentación y Justificación SOLID - Quetxal TV

Los principios SOLID se aplican en Quetxal TV para mantener servicios separados, clases con responsabilidades claras, dependencias inyectadas y código más fácil de probar. La arquitectura de microservicios ayuda a reforzar estos principios, pero también se observan dentro de los módulos del API Gateway y los servicios.

---

##  S - Single Responsibility Principle

Cada clase debe tener una única responsabilidad.

### Evidencia: MetricsService solo calcula y expone métricas

Ruta: `app/QuetxalTV/api-gateway/src/metrics/metrics.service.ts`

```ts
import { Injectable } from '@nestjs/common';

interface RequestMetric {
  count: number;
  durationSumSeconds: number;
}

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, RequestMetric>();
  private readonly startedAt = Date.now();

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const normalizedMethod = this.sanitizeLabel(method || 'UNKNOWN');
    const normalizedRoute = this.normalizeRoute(route || '/');
    const normalizedStatus = String(statusCode || 0);
    const key = `${normalizedMethod}|${normalizedRoute}|${normalizedStatus}`;

    const current = this.requests.get(key) || {
      count: 0,
      durationSumSeconds: 0,
    };

    current.count += 1;
    current.durationSumSeconds += durationSeconds;
    this.requests.set(key, current);
  }

  renderPrometheusMetrics(): string {
    const lines: string[] = [];
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    lines.push(
      '# HELP quetxal_api_gateway_uptime_seconds Tiempo de vida del API Gateway en segundos.',
    );
    lines.push('# TYPE quetxal_api_gateway_uptime_seconds gauge');
    lines.push(`quetxal_api_gateway_uptime_seconds ${uptimeSeconds}`);

    lines.push(
      '# HELP quetxal_api_gateway_memory_heap_used_bytes Memoria heap utilizada por el API Gateway.',
    );
    lines.push('# TYPE quetxal_api_gateway_memory_heap_used_bytes gauge');
    lines.push(`quetxal_api_gateway_memory_heap_used_bytes ${memory.heapUsed}`);

    lines.push(
      '# HELP quetxal_api_gateway_http_requests_total Total de solicitudes HTTP atendidas por el API Gateway.',
    );
    lines.push('# TYPE quetxal_api_gateway_http_requests_total counter');

    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');

      lines.push(
        `quetxal_api_gateway_http_requests_total{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.count}`,
      );
    }

    lines.push(
      '# HELP quetxal_api_gateway_http_request_duration_seconds_sum Suma de duración de solicitudes HTTP en segundos.',
    );
    lines.push(
      '# TYPE quetxal_api_gateway_http_request_duration_seconds_sum counter',
    );

    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');

      lines.push(
        `quetxal_api_gateway_http_request_duration_seconds_sum{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.durationSumSeconds.toFixed(6)}`,
      );
    }

    lines.push(
      '# HELP quetxal_api_gateway_http_request_duration_seconds_count Cantidad de solicitudes consideradas para la duración.',
```

### Evidencia: MetricsController solo atiende el endpoint HTTP

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

**Justificación:** el cálculo de métricas no está mezclado con el controlador. El controlador solo responde HTTP y delega al servicio.

---

## O - Open/Closed Principle

El sistema debe poder extenderse sin modificar innecesariamente código existente.

### Evidencia: AppModule integra nuevos módulos por composición

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

**Justificación:** para agregar métricas se creó `MetricsModule` y se integró al módulo principal sin reescribir los módulos de Auth, Catalog, Subscription o Historial.

---

## L - Liskov Substitution Principle

Los componentes que cumplen un contrato deben poder usarse sin romper al cliente.

### Evidencia: gRPC define contratos compartidos

Ruta: `app/QuetxalTV/api-gateway/src/proto/historial.proto`

```proto
syntax = "proto3";

package historial;

service HistorialService {
  rpc UpdateMovieProgress (UpdateMovieProgressRequest) returns (ProgressResponse);
  rpc UpdateEpisodeProgress (UpdateEpisodeProgressRequest) returns (ProgressResponse);
  rpc GetContinueWatching (GetContinueWatchingRequest) returns (ContinueWatchingResponse);
  rpc GetContentProgress (GetContentProgressRequest) returns (ProgressResponse);
  rpc GetHistoryAuditLogs (GetHistoryAuditLogsRequest) returns (HistoryAuditLogsResponse);

  rpc HealthLive (HealthCheckRequest) returns (HealthCheckResponse);
  rpc HealthReady (HealthCheckRequest) returns (HealthCheckResponse);
}

message UpdateMovieProgressRequest {
  string profile_id = 1;
  string content_id = 2;
  int32 minute_reached = 3;
  int32 total_duration_min = 4;
}

message UpdateEpisodeProgressRequest {
  string profile_id = 1;
  string content_id = 2;
  string season_id = 3;
  string episode_id = 4;
  int32 season_num = 5;
  int32 episode_num = 6;
  int32 minute_reached = 7;
  int32 total_duration_min = 8;
}

message GetContinueWatchingRequest {
  string profile_id = 1;
  int32 limit = 2;
}

message GetContentProgressRequest {
  string profile_id = 1;
  string content_id = 2;
}

message ProgressResponse {
  bool success = 1;
  string message = 2;
  ProgressItem progress = 3;
}

message ContinueWatchingResponse {
  repeated ProgressItem items = 1;
}

message ProgressItem {
  string progress_id = 1;
  string profile_id = 2;
  string content_id = 3;
  string content_type = 4;

  int32 minute_reached = 5;
  int32 total_duration_min = 6;
  double completion_pct = 7;
  bool is_completed = 8;
  string last_watched_at = 9;

  string last_episode_id = 10;
  int32 last_season_num = 11;
  int32 last_episode_num = 12;
  int32 last_ep_minute = 13;
}

message GetHistoryAuditLogsRequest {
  string table_name = 1;
  string action = 2;
  int32 limit = 3;
  int32 offset = 4;
}

message HistoryAuditLogsResponse {
  repeated HistoryAuditLogItem items = 1;
```

**Justificación:** el API Gateway depende del contrato definido en `.proto`, no de la implementación interna del historial. Mientras el servicio respete el contrato, puede sustituirse la implementación.

---

## I - Interface Segregation Principle

Los clientes no deben depender de métodos que no utilizan.

### Evidencia: separación de rutas y módulos del API Gateway

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

**Justificación:** el Gateway separa funcionalidades en módulos específicos: Auth, Catalog, Subscription, Historial, Audit, Download y Metrics. Cada módulo expone únicamente las operaciones que le corresponden.

---

## D - Dependency Inversion Principle

Los servicios de alto nivel no deben depender directamente de detalles de bajo nivel, sino de abstracciones o dependencias inyectadas.

### Evidencia: AuthService recibe repositorio, JWT y cliente de notificación por constructor

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

    // ── INTEGRACIÓN FUTURA — Notification Service ────────────────
    // Cuando el Notification Service esté disponible, reemplazar este
   // ── Notification Service — Welcome Email ─────────────────────
  try {
      await this.notificationClient.sendWelcomeEmail({
        user_id:    userId,
        user_email: req.email,
        user_name:  req.displayName,
      });
    } catch (err: unknown) {
      this.logger.warn(`Email de bienvenida no enviado: ${(err as Error).message}`);
    }
    // ────────────────────────────────────────────────────────────
    return {
      userId,
      profileId,
```

**Justificación:** `AuthService` no crea directamente el repositorio ni el cliente de notificación. Recibe esas dependencias por inyección, lo que facilita pruebas y reduce acoplamiento.

---

## SOLID en Python: separación Service/Repository

Ruta: `app/QuetxalTV/microservices/historial-service/app/history/service.py`

```python
from uuid import UUID

from app.history.repository import HistorialRepository


class HistorialAppService:
    def __init__(self):
        self.repository = HistorialRepository()

    def validar_uuid(self, valor, nombre_campo):
        try:
            UUID(valor)
        except ValueError:
            raise ValueError(f"{nombre_campo} debe ser un UUID válido")

    def update_movie_progress(self, request):
        self.validar_uuid(request.profile_id, "profile_id")
        self.validar_uuid(request.content_id, "content_id")

        if request.minute_reached < 0:
            raise ValueError("minute_reached no puede ser negativo")

        total_duration = request.total_duration_min
        if total_duration <= 0:
            total_duration = None

        data = {
            "profile_id": request.profile_id,
            "content_id": request.content_id,
            "minute_reached": request.minute_reached,
            "total_duration_min": total_duration,
        }

        self.repository.guardar_progreso_pelicula(data)
        return "Progreso de película guardado correctamente"

    def update_episode_progress(self, request):
        self.validar_uuid(request.profile_id, "profile_id")
        self.validar_uuid(request.content_id, "content_id")
        self.validar_uuid(request.season_id, "season_id")
        self.validar_uuid(request.episode_id, "episode_id")

        if request.season_num <= 0:
            raise ValueError("season_num debe ser mayor a 0")

        if request.episode_num <= 0:
            raise ValueError("episode_num debe ser mayor a 0")

        if request.minute_reached < 0:
            raise ValueError("minute_reached no puede ser negativo")

        total_duration = request.total_duration_min
        if total_duration <= 0:
            total_duration = None

        data = {
            "profile_id": request.profile_id,
            "content_id": request.content_id,
            "season_id": request.season_id,
            "episode_id": request.episode_id,
            "season_num": request.season_num,
            "episode_num": request.episode_num,
            "minute_reached": request.minute_reached,
            "total_duration_min": total_duration,
        }

        self.repository.guardar_progreso_serie(data)
        return "Progreso de serie guardado correctamente"

    def get_continue_watching(self, profile_id, limit):
        self.validar_uuid(profile_id, "profile_id")

        if limit <= 0:
            limit = 20

        return self.repository.obtener_continuar_viendo(profile_id, limit)

    def get_content_progress(self, profile_id, content_id):
        self.validar_uuid(profile_id, "profile_id")
        self.validar_uuid(content_id, "content_id")
```

Ruta: `app/QuetxalTV/microservices/historial-service/app/history/repository.py`

```python
import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import Config


class HistorialRepository:
    def __init__(self):
        self.config = Config()

    def get_connection(self):
        return psycopg2.connect(
            host=self.config.DB_HOST,
            port=self.config.DB_PORT,
            dbname=self.config.DB_NAME,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            sslmode=self.config.DB_SSLMODE,
            cursor_factory=RealDictCursor,
            options=f"-c search_path={self.config.DB_SCHEMA},public"
        )

    def guardar_progreso_pelicula(self, data):
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_movie_progress(
                %s::uuid,
                %s::uuid,
                %s::integer,
                %s::integer
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def guardar_progreso_serie(self, data):
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_episode_progress(
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::smallint,
                %s::smallint,
                %s::integer,
                %s::integer
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["season_id"],
                    data["episode_id"],
                    data["season_num"],
                    data["episode_num"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def obtener_continuar_viendo(self, profile_id, limit=20):
        query = f"""
```

**Justificación:** la capa de servicio valida reglas de negocio y la capa de repositorio ejecuta consultas. Esto evita mezclar validaciones con acceso a base de datos.

## Conclusión

SOLID se refleja en la separación de módulos, servicios, controladores, repositorios y contratos gRPC. Esto permite que el proyecto sea más mantenible, testeable y extensible.
