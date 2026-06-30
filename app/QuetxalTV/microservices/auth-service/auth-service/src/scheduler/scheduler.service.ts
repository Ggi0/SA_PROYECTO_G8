import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulerRepository } from './scheduler.repository';

// ═══════════════════════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURACIÓN DE TIEMPOS — AJUSTA AQUÍ PARA PRUEBAS O PRODUCCIÓN
//
//  MODO PRUEBA (valores actuales):
//    INACTIVITY_MINUTES  = 10   → desactiva si lleva 10 min sin login
//    GRACE_PERIOD_MINUTES = 5   → borra si lleva 5 min desactivado
//    CRON_DEACTIVATE     = cada 2 minutos (para ver resultado rápido)
//    CRON_PURGE          = cada 2 minutos (offset de 1 min respecto al anterior)
//
//  MODO PRODUCCIÓN (ejemplo comentado abajo):
//    INACTIVITY_MINUTES  = 90 * 24 * 60  → 90 días sin login
//    GRACE_PERIOD_MINUTES = 30 * 24 * 60 → 30 días desactivado antes de purgar
//    CRON_DEACTIVATE     = '0 0 * * *'   → todos los días a las 00:00
//    CRON_PURGE          = '0 3 * * *'   → todos los días a las 03:00
// ═══════════════════════════════════════════════════════════════════════════════

/** Minutos de inactividad antes de desactivar la cuenta */
const INACTIVITY_MINUTES = 20;  // TODO: cambiar a 10

/** Minutos que una cuenta puede estar desactivada antes de ser eliminada */
const GRACE_PERIOD_MINUTES = 5;

/**
 * Expresión cron para la FASE 1 (desactivación).
 *
 * PRUEBAS:     '* /2 * * * *'   → cada 2 minutos  (quita el espacio entre / y 2)
 * PRODUCCIÓN:  '0 0 * * *'      → todos los días a las 00:00
 *
 * Referencia de cron en NestJS:
 *   segundos  minutos  horas  día-mes  mes  día-semana
 *   0         0        0      *        *    *          → cada día medianoche
 */
const CRON_DEACTIVATE = '*/2 * * * *'; // cada 2 minutos — MODO PRUEBA

/**
 * Expresión cron para la FASE 2 (purga/DELETE).
 *
 * PRUEBAS:     '1/2 * * * *'    → cada 2 minutos, con 1 minuto de offset
 * PRODUCCIÓN:  '0 3 * * *'      → todos los días a las 03:00
 */
const CRON_PURGE = '1/2 * * * *'; // cada 2 minutos (offset 1 min) — MODO PRUEBA

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly schedulerRepository: SchedulerRepository) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 1: Desactivar cuentas inactivas
  //
  // Se ejecuta según CRON_DEACTIVATE.
  // Busca usuarios 'client' activos cuyo último login (o fecha de creación
  // si nunca loguearon) supere INACTIVITY_MINUTES minutos.
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron(CRON_DEACTIVATE, { name: 'deactivate-inactive-users' })
  async handleDeactivateInactiveUsers(): Promise<void> {
    this.logger.log(
      `[CRON FASE-1] Iniciando desactivación de cuentas inactivas` +
      ` (umbral: ${INACTIVITY_MINUTES} minutos)`,
    );

    try {
      const { count, users } =
        await this.schedulerRepository.deactivateInactiveUsers(INACTIVITY_MINUTES);

      if (count === 0) {
        this.logger.log('[CRON FASE-1] No se encontraron cuentas inactivas para desactivar.');
        return;
      }

      this.logger.warn(`[CRON FASE-1] Se desactivaron ${count} cuenta(s).`);

      // ── Registrar cada usuario en audit_trail (UPDATE old→new) ──────────────
      for (const rawUser of users) {
        // TypeORM con dataSource.query() raw puede retornar snake_case O camelCase
        // dependiendo de la versión y configuración. Normalizamos aquí para cubrir ambos.
        const user = {
          user_id:             rawUser.user_id             ?? rawUser.userId,
          email:               rawUser.email,
          role:                rawUser.role,
          last_login_at:       rawUser.last_login_at       ?? rawUser.lastLoginAt,
          created_at:          rawUser.created_at          ?? rawUser.createdAt,
          deactivated_at:      rawUser.deactivated_at      ?? rawUser.deactivatedAt,
          deactivation_reason: rawUser.deactivation_reason ?? rawUser.deactivationReason,
        };

        // old_data = estado previo (is_active=true, sin deactivated_at)
        const oldData = {
          user_id: user.user_id,
          email: user.email,
          is_active: true,
          deactivated_at: null,
          deactivation_reason: null,
        };

        // new_data = estado nuevo (is_active=false, con deactivated_at)
        const newData = {
          user_id: user.user_id,
          email: user.email,
          is_active: false,
          deactivated_at: user.deactivated_at,
          deactivation_reason: user.deactivation_reason,
        };

        await this.schedulerRepository.logAuditTrail(
          'UPDATE',
          'users',
          user.user_id,
          oldData,
          newData,
          null, // actor: sistema automático (null = cron)
        );

        // ── Registrar evento en audit_log (seguridad) ────────────────────────
        await this.schedulerRepository.logAuditEvent(
          user.user_id,
          'ACCOUNT_AUTO_DEACTIVATED',
          `Cuenta desactivada automáticamente por inactividad de ${INACTIVITY_MINUTES} minutos.`,
          {
            email: user.email,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
            motivo: user.last_login_at
              ? 'inactividad_post_login'
              : 'nunca_inicio_sesion',
          },
        );


        this.logger.warn(
          `[CRON FASE-1] Desactivado: ${user.email}` +
          ` | last_login: ${user.last_login_at ?? 'nunca'}` +
          ` | creado: ${user.created_at}`,
        );
      }

      // ── Resumen global del batch en audit_log ────────────────────────────────
      await this.schedulerRepository.logAuditEvent(
        null,
        'CRON_DEACTIVATION_BATCH',
        `Batch de desactivación automática completado. Total: ${count} cuenta(s).`,
        {
          total_desactivadas: count,
          umbral_minutos: INACTIVITY_MINUTES,
          ejecutado_en: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.error('[CRON FASE-1] Error durante la desactivación:', error);

      // Registrar el fallo en audit_log para trazabilidad
      await this.schedulerRepository.logAuditEvent(
        null,
        'CRON_DEACTIVATION_ERROR',
        `Error en el cron de desactivación: ${(error as Error).message}`,
        { stack: (error as Error).stack },
      ).catch(() => {}); // no lanzar si el log mismo falla
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 2: Purgar (DELETE físico) cuentas desactivadas
  //
  // Se ejecuta según CRON_PURGE.
  // Busca usuarios 'client' con is_active=FALSE y deactivated_at hace
  // más de GRACE_PERIOD_MINUTES minutos, y los elimina definitivamente.
  //
  // El CASCADE en la DB elimina automáticamente:
  //   → auth.profiles, auth.refresh_tokens, auth.verification_tokens
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron(CRON_PURGE, { name: 'purge-deactivated-users' })
  async handlePurgeDeactivatedUsers(): Promise<void> {
    this.logger.log(
      `[CRON FASE-2] Iniciando purga de cuentas desactivadas` +
      ` (período de gracia: ${GRACE_PERIOD_MINUTES} minutos)`,
    );

    try {
      const { count, users } =
        await this.schedulerRepository.purgeDeactivatedUsers(GRACE_PERIOD_MINUTES);

      if (count === 0) {
        this.logger.log('[CRON FASE-2] No hay cuentas listas para purgar.');
        return;
      }

      this.logger.warn(`[CRON FASE-2] Se eliminaron definitivamente ${count} cuenta(s).`);

      // ── Registrar cada usuario eliminado en audit_trail ──────────────────────
      for (const rawUser of users) {
        // Normalización snake_case / camelCase igual que FASE-1
        const user = {
          user_id:             rawUser.user_id        ?? rawUser.userId,
          email:               rawUser.email,
          role:                rawUser.role,
          created_at:          rawUser.created_at     ?? rawUser.createdAt,
          last_login_at:       rawUser.last_login_at  ?? rawUser.lastLoginAt,
          deactivated_at:      rawUser.deactivated_at ?? rawUser.deactivatedAt,
          deactivation_reason: rawUser.deactivation_reason ?? rawUser.deactivationReason,
        };

        // Al ser DELETE, guardamos old_data y new_data = null
        await this.schedulerRepository.logAuditTrail(
          'DELETE',
          'users',
          user.user_id,
          {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            deactivated_at: user.deactivated_at,
            deactivation_reason: user.deactivation_reason,
          },
          null, // new_data = null porque el registro ya no existe
          null, // actor = sistema
        );

        // ── audit_log: evento de purga por usuario ───────────────────────────
        await this.schedulerRepository.logAuditEvent(
          null, // user eliminado, no podemos referenciar su UUID (ya no existe en DB)
          'ACCOUNT_PURGED',
          `Cuenta eliminada definitivamente del sistema (${user.email}).`,
          {
            deleted_user_id: user.user_id,
            email: user.email,
            deactivated_at: user.deactivated_at,
            grace_period_minutes: GRACE_PERIOD_MINUTES,
          },
        );

        this.logger.warn(
          `[CRON FASE-2] Eliminado: ${user.email}` +
          ` | desactivado el: ${user.deactivated_at}`,
        );
      }

      // ── Resumen global del batch ─────────────────────────────────────────────
      await this.schedulerRepository.logAuditEvent(
        null,
        'CRON_PURGE_BATCH',
        `Batch de purga completado. Total eliminados: ${count} cuenta(s).`,
        {
          total_eliminadas: count,
          grace_period_minutos: GRACE_PERIOD_MINUTES,
          ejecutado_en: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.error('[CRON FASE-2] Error durante la purga:', error);

      await this.schedulerRepository.logAuditEvent(
        null,
        'CRON_PURGE_ERROR',
        `Error en el cron de purga: ${(error as Error).message}`,
        { stack: (error as Error).stack },
      ).catch(() => {});
    }
  }
}