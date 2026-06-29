# Justificación de RabbitMQ - Quetxal TV

En la revisión del proyecto entregado no se evidenció una implementación activa de RabbitMQ en archivos de configuración, Docker Compose ni código fuente. La comunicación interna implementada actualmente se realiza principalmente mediante gRPC entre el API Gateway y los microservicios.

Por lo tanto, esta justificación se presenta como una decisión arquitectónica evaluada para comunicación asíncrona, pero no como una tecnología ya integrada en el código actual.

## ¿Para qué sería útil RabbitMQ en Quetxal TV?

RabbitMQ sería útil para desacoplar procesos que no necesitan responder inmediatamente al usuario, por ejemplo:

- Enviar correos de bienvenida.
- Enviar recibos de compra.
- Notificar nuevas publicaciones.
- Procesar eventos de auditoría.
- Reintentar envíos fallidos.
- Ejecutar tareas posteriores a una compra sin bloquear la respuesta HTTP.

## Decisión actual del proyecto

Actualmente, la comunicación se realiza por gRPC. Por ejemplo, el Auth Service invoca al Notification Service para enviar correo de bienvenida después del registro.

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

## Mecanismo asíncrono actual basado en base de datos

Aunque no se usa RabbitMQ, el servicio de notificaciones sí maneja una cola lógica mediante base de datos. La función obtiene notificaciones pendientes y usa `FOR UPDATE SKIP LOCKED` para evitar que dos workers procesen el mismo registro.

Ruta: `app/QuetxalTV/database/notificacion.sql`

```sql
CREATE OR REPLACE FUNCTION fn_get_pending_notifications(p_limit INT DEFAULT 10)
RETURNS TABLE (
    notification_id  UUID,
    recipient_email  VARCHAR,
    recipient_name   VARCHAR,
    type_code        VARCHAR,
    template_file    VARCHAR,
    subject_template VARCHAR,
    template_data    JSONB,
    attempts         SMALLINT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.notification_id,
        n.recipient_email,
        n.recipient_name,
        n.type_code,
        nt.template_file,
        nt.subject_template,
        n.template_data,
        n.attempts
    FROM notifications n
    JOIN notification_types nt ON n.type_code = nt.type_code
    WHERE n.status IN ('PENDING', 'RETRYING')
      AND (n.retry_after IS NULL OR n.retry_after <= NOW())
      AND n.attempts < n.max_attempts
    ORDER BY n.created_at ASC
    LIMIT p_limit
    -- FOR UPDATE SKIP LOCKED evita que dos workers procesen la misma notificación
    FOR UPDATE SKIP LOCKED;
END;
$$;


-- FUNCIÓN: fn_notification_stats(p_days INT) --> TABLE
```

## Cómo se integraría RabbitMQ si se agrega después

Ejemplo de publicación de evento que podría agregarse en Auth Service o Subscription Service:

```ts
// Ejemplo propuesto, no presente actualmente en el repositorio.
await rabbitPublisher.publish('notification.welcome', {
  userId,
  email: req.email,
  displayName: req.displayName,
});
```

Ejemplo de consumidor en Notification Service:

```python
# Ejemplo propuesto, no presente actualmente en el repositorio.
def handle_welcome_event(event):
    email_sender.send(
        to_email=event['email'],
        subject='Bienvenido a Quetxal TV',
        template_file='welcome.html',
        template_data=event,
    )
```

## Conclusión

RabbitMQ es una buena opción para eventos asíncronos, pero el proyecto actual no lo implementa directamente. La arquitectura ya está preparada para separar responsabilidades mediante microservicios y gRPC; RabbitMQ podría incorporarse en una siguiente fase para desacoplar tareas no críticas como correos, auditoría, reintentos y eventos de negocio.
