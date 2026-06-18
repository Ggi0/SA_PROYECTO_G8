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
}