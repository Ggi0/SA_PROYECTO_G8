import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditTrail } from './entity/audit-trail.entity';

interface GetAuditLogsParams {
  userId?: string;
  tableName?: string;
  operation?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // Obtener logs con filtros + paginación
  // ─────────────────────────────────────────────
  async findAuditLogs(params: GetAuditLogsParams) {
    const {
      userId,
      tableName,
      operation,
      fromDate,
      toDate,
      page = 1,
      pageSize = 20,
    } = params;

    const qb = this.dataSource
      .getRepository(AuditTrail)
      .createQueryBuilder('a');

    // ── filtros dinámicos ──────────────────────

    if (userId) {
      qb.andWhere('a.user_id = :userId', { userId });
    }

    if (tableName) {
      qb.andWhere('a.table_name = :tableName', { tableName });
    }

    if (operation) {
      qb.andWhere('a.operation = :operation', { operation });
    }

    if (fromDate) {
      qb.andWhere('a.changed_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('a.changed_at <= :toDate', { toDate });
    }

    // ── orden + paginación ─────────────────────
    qb.orderBy('a.changed_at', 'DESC');

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [logs, total] = await qb.getManyAndCount();

    return {
      logs,
      total,
      page,
      pageSize,
    };
  }

  // ─────────────────────────────────────────────
  // Para exportar (sin paginación)
  // ─────────────────────────────────────────────
  async findAuditLogsForExport(params: GetAuditLogsParams) {
    const {
      userId,
      tableName,
      operation,
      fromDate,
      toDate,
    } = params;

    const qb = this.dataSource
      .getRepository(AuditTrail)
      .createQueryBuilder('a');

    if (userId) {
      qb.andWhere('a.user_id = :userId', { userId });
    }

    if (tableName) {
      qb.andWhere('a.table_name = :tableName', { tableName });
    }

    if (operation) {
      qb.andWhere('a.operation = :operation', { operation });
    }

    if (fromDate) {
      qb.andWhere('a.changed_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('a.changed_at <= :toDate', { toDate });
    }

    qb.orderBy('a.changed_at', 'DESC');

    return qb.getMany();
  }




  // ─────────────────────────────────────────────
// Todos los usuarios con sus perfiles asociados
// Incluye campos del cron: is_active, last_login_at, deactivated_at, etc.
// ─────────────────────────────────────────────
async findAllUsersWithProfiles() {
  const query = `
    SELECT
      u.user_id,
      u.email,
      u.role,
      u.is_active,
      u.created_at,
      u.updated_at,
      u.last_login_at,
      u.deactivated_at,
      u.deactivation_reason,
      COALESCE(
        json_agg(
          json_build_object(
            'profile_id',   p.profile_id,
            'display_name', p.display_name,
            'avatar_url',   p.avatar_url,
            'is_kids_mode', p.is_kids_mode,
            'created_at',   p.created_at
          )
          ORDER BY p.created_at
        ) FILTER (WHERE p.profile_id IS NOT NULL),
        '[]'::json
      ) AS profiles
    FROM auth.users u
    LEFT JOIN auth.profiles p ON p.user_id = u.user_id
    GROUP BY
      u.user_id, u.email, u.role, u.is_active,
      u.created_at, u.updated_at, u.last_login_at,
      u.deactivated_at, u.deactivation_reason
    ORDER BY u.created_at DESC
  `;

  return this.dataSource.query(query);
}

// ─────────────────────────────────────────────
// Audit log con filtros (tabla audit_log, no audit_trail)
// Esta es la tabla donde el cron registra ACCOUNT_AUTO_DEACTIVATED, ACCOUNT_PURGED, etc.
// ─────────────────────────────────────────────
async findAuditEventLogs(params: {
  eventType?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { eventType, userId, fromDate, toDate, page = 1, pageSize = 20 } = params;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (eventType) {
    conditions.push(`event_type = $${idx++}`);
    values.push(eventType);
  }
  if (userId) {
    conditions.push(`user_id = $${idx++}`);
    values.push(userId);
  }
  if (fromDate) {
    conditions.push(`created_at >= $${idx++}`);
    values.push(fromDate);
  }
  if (toDate) {
    conditions.push(`created_at <= $${idx++}`);
    values.push(toDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const dataQuery = `
    SELECT log_id, user_id, event_type, description, metadata, created_at
    FROM auth.audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  const countQuery = `
    SELECT COUNT(*) AS total FROM auth.audit_log ${where}
  `;

  const [rows, countResult] = await Promise.all([
    this.dataSource.query(dataQuery, [...values, pageSize, offset]),
    this.dataSource.query(countQuery, values),
  ]);

  return {
    logs: rows,
    total: parseInt(countResult[0].total, 10),
    page,
    pageSize,
  };
}




}