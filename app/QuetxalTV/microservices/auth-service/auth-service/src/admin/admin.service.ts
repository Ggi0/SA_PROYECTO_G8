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


  // ─────────────────────────────────────────────
// GET ALL USERS WITH PROFILES
// Para visualizar el estado del cron en el frontend
// ─────────────────────────────────────────────
async getAllUsersWithProfiles(request: any) {
  await this.validateAdmin(request.adminUserId);

  const rows = await this.auditRepository.findAllUsersWithProfiles();

  const users = rows.map((u: any) => ({
    userId:             u.user_id,
    email:              u.email,
    role:               u.role,
    isActive:           u.is_active,
    createdAt:          u.created_at  ? new Date(u.created_at).toISOString()  : '',
    updatedAt:          u.updated_at  ? new Date(u.updated_at).toISOString()  : '',
    lastLoginAt:        u.last_login_at    ? new Date(u.last_login_at).toISOString()    : '',
    deactivatedAt:      u.deactivated_at   ? new Date(u.deactivated_at).toISOString()   : '',
    deactivationReason: u.deactivation_reason ?? '',
    profiles: (u.profiles ?? []).map((p: any) => ({
      profileId:   p.profile_id,
      displayName: p.display_name,
      avatarUrl:   p.avatar_url   ?? '',
      isKidsMode:  p.is_kids_mode ?? false,
    })),
  }));

  return { users, total: users.length };
}

// ─────────────────────────────────────────────
// GET AUDIT EVENT LOGS (audit_log, no audit_trail)
// Muestra eventos del cron: ACCOUNT_AUTO_DEACTIVATED, ACCOUNT_PURGED, etc.
// ─────────────────────────────────────────────
async getAuditEventLogs(request: any) {
  await this.validateAdmin(request.adminUserId);

  const result = await this.auditRepository.findAuditEventLogs({
    eventType: request.eventType,
    userId:    request.userId,
    fromDate:  request.fromDate,
    toDate:    request.toDate,
    page:      request.page,
    pageSize:  request.pageSize,
  });

  return {
    logs: result.logs.map((l: any) => ({
      logId:       String(l.log_id),
      userId:      l.user_id   ?? '',
      eventType:   l.event_type,
      description: l.description ?? '',
      metadata:    l.metadata  ? JSON.stringify(l.metadata) : '{}',
      createdAt:   l.created_at ? new Date(l.created_at).toISOString() : '',
    })),
    totalRecords: result.total,
    page:         result.page,
    pageSize:     result.pageSize,
  };
}




}
