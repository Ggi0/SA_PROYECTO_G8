import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SchedulerRepository {
  private readonly logger = new Logger(SchedulerRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 1: Desactivar cuentas inactivas
  //
  // Lógica de inactividad:
  //   - Si el usuario ALGUNA VEZ inició sesión → usamos last_login_at
  //   - Si NUNCA inició sesión (last_login_at IS NULL) → usamos created_at
  //
  // Solo aplica a usuarios con role = 'client' y que estén activos (is_active = TRUE)
  // ─────────────────────────────────────────────────────────────────────────────
  async deactivateInactiveUsers(inactivityMinutes: number): Promise<{ count: number; users: any[] }> {
    /**
     * PARA PRUEBAS: inactivityMinutes = 10 minutos
     * PARA PRODUCCIÓN: cambia a días multiplicando → inactivityMinutes = 90 * 24 * 60
     *
     * El INTERVAL de PostgreSQL acepta: '10 minutes', '1 hour', '90 days', etc.
     * Construimos dinámicamente con el valor numérico en minutos.
     */
    const interval = `${inactivityMinutes} minutes`;

    const query = `
      UPDATE auth.users
      SET
        is_active          = FALSE,
        deactivated_at     = NOW(),
        deactivation_reason = 'inactividad_automatica',
        updated_at         = NOW()
      WHERE
        role      = 'client'             -- Solo clientes, nunca admins
        AND is_active = TRUE             -- Solo los que aún están activos
        AND (
          -- Caso 1: El usuario alguna vez inició sesión
          -- → medimos desde el último login
          (last_login_at IS NOT NULL AND last_login_at < NOW() - INTERVAL '${interval}')

          OR

          -- Caso 2: El usuario NUNCA inició sesión (creó cuenta y la abandonó)
          -- → medimos desde que se creó la cuenta
          (last_login_at IS NULL AND created_at < NOW() - INTERVAL '${interval}')
        )
      RETURNING
        user_id,
        email,
        role,
        last_login_at,
        created_at,
        deactivated_at,
        deactivation_reason
    `;

    const result = await this.dataSource.query(query);
    return { count: result.length, users: result };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 2: Purgar (DELETE físico) cuentas que ya fueron desactivadas
  //         y llevan X minutos desactivadas sin reactivarse.
  //
  // ON DELETE CASCADE en la DB se encarga de eliminar:
  //   → auth.profiles   (todos los perfiles del usuario)
  //   → auth.refresh_tokens
  //   → auth.verification_tokens
  //   → auth.audit_log  (los logs asociados al user_id)
  //
  // La tabla audit_trail tiene user_id NULL-able, así que no bloquea el DELETE.
  // ─────────────────────────────────────────────────────────────────────────────
  async purgeDeactivatedUsers(gracePeriodMinutes: number): Promise<{ count: number; users: any[] }> {
    /**
     * PARA PRUEBAS: gracePeriodMinutes = 5 minutos
     * PARA PRODUCCIÓN: cambia a días → gracePeriodMinutes = 30 * 24 * 60
     *
     * Este período es la "gracia" entre que se desactiva y que se borra definitivamente.
     * Sirve como ventana de seguridad por si el usuario quiere reactivar su cuenta.
     */
    const interval = `${gracePeriodMinutes} minutes`;

    // Primero capturamos los datos ANTES de borrar, para el audit_trail
    const selectQuery = `
      SELECT
        user_id,
        email,
        role,
        created_at,
        last_login_at,
        deactivated_at,
        deactivation_reason
      FROM auth.users
      WHERE
        role      = 'client'
        AND is_active   = FALSE
        AND deactivated_at IS NOT NULL
        AND deactivated_at < NOW() - INTERVAL '${interval}'
    `;

    const usersToDelete = await this.dataSource.query(selectQuery);

    if (usersToDelete.length === 0) {
      return { count: 0, users: [] };
    }

    // Extraemos los UUIDs para el DELETE
    const userIds = usersToDelete.map((u: any) => u.user_id ?? u.userId);

    // DELETE físico dentro de una transacción.
    //
    // IMPORTANTE: seteamos app.cron_purge_active = 'true' ANTES del DELETE.
    // El trigger fn_prevent_delete_last_profile lee esta variable de sesión
    // y permite eliminar el último perfil cuando el cron está purgando.
    // Sin esto, el CASCADE falla porque el trigger bloquea borrar el único perfil.
    //
    // SET LOCAL aplica solo durante esta transacción — se resetea automáticamente al commit.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Señal para el trigger: "el cron está purgando, permitir CASCADE"
      await queryRunner.query(`SET LOCAL "app.cron_purge_active" = 'true'`);

      // DELETE — el CASCADE elimina profiles, refresh_tokens, verification_tokens
      await queryRunner.query(
        `DELETE FROM auth.users WHERE user_id = ANY($1::uuid[])`,
        [userIds],
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { count: usersToDelete.length, users: usersToDelete };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Registrar en audit_log (tabla de eventos de seguridad)
  // ─────────────────────────────────────────────────────────────────────────────
  async logAuditEvent(
    userId: string | null,
    eventType: string,
    description: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const query = `
      INSERT INTO auth.audit_log (user_id, event_type, description, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    await this.dataSource.query(query, [
      userId,
      eventType,
      description,
      JSON.stringify(metadata),
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Registrar en audit_trail (tabla de cambios transaccionales INSERT/UPDATE/DELETE)
  // Esta tabla registra el estado old/new de cada fila afectada.
  // ─────────────────────────────────────────────────────────────────────────────
  async logAuditTrail(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string | null,
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
    actorUserId: string | null = null,
  ): Promise<void> {
    const query = `
      INSERT INTO auth.audit_trail (
        table_name,
        operation,
        user_id,
        record_id,
        old_data,
        new_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await this.dataSource.query(query, [
      tableName,
      operation,
      actorUserId,
      recordId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    ]);
  }
}