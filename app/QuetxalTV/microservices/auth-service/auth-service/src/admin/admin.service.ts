import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuditRepository } from './admin.repository';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ROLES } from '../common/constants';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  // Validar que el usuario sea admin
  // ─────────────────────────────────────────────
  private async validateAdmin(adminUserId: string) {
    const userRepo = this.dataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { userId: adminUserId },
    });

    if (!user || user.role !== ROLES.ADMIN) {
      throw new ForbiddenException('Acceso denegado');
    }
  }

  // ─────────────────────────────────────────────
  // GET AUDIT LOGS
  // ─────────────────────────────────────────────
  async getAuditLogs(request: any) {
    await this.validateAdmin(request.adminUserId);

    const result = await this.auditRepository.findAuditLogs({
      userId: request.userId,
      tableName: request.tableName,
      operation: request.operation,
      fromDate: request.fromDate,
      toDate: request.toDate,
      page: request.page,
      pageSize: request.pageSize,
    });

    // TODO : agregar el userID en auth y perfiles para que salga aqui
    return {
        logs: result.logs.map((l) => ({
          auditId: l.auditId,
          tableName: l.tableName,
          operation: l.operation,
          userId: l.userId,
          recordId: l.recordId,
          changedAt: l.changedAt.toISOString(),
          oldData: l.oldData ? JSON.stringify(l.oldData) : '',
          newData: l.newData ? JSON.stringify(l.newData) : '',
        })),
      totalRecords: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  // ─────────────────────────────────────────────
  // EXPORT AUDIT LOGS (CSV básico)
  // ─────────────────────────────────────────────
  async exportAuditLogs(request: any) {
    await this.validateAdmin(request.adminUserId);

    const logs = await this.auditRepository.findAuditLogsForExport({
      userId: request.userId,
      tableName: request.tableName,
      operation: request.operation,
      fromDate: request.fromDate,
      toDate: request.toDate,
    });

    if (request.format === 'csv') {
      const csv = this.generateCSV(logs);

      return {
        file: Buffer.from(csv),
        file_name: 'audit_report.csv',
      };
    }

    // fallback simple
    return {
      file: Buffer.from(JSON.stringify(logs)),
      file_name: 'audit_report.json',
    };
  }

  // ─────────────────────────────────────────────
  // GENERADOR CSV SIMPLE
  // ─────────────────────────────────────────────
  private generateCSV(logs: any[]): string {
    const headers = [
      'audit_id',
      'table_name',
      'operation',
      'user_id',
      'record_id',
      'changed_at',
    ];

    const rows = logs.map((l) => [
      l.auditId,
      l.tableName,
      l.operation,
      l.userId,
      l.recordId,
      l.changedAt.toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');
  }
}
