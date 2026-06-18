// test/admin.service.spec.ts

import { AuditService } from '../../src/admin/admin.service';
import { ForbiddenException } from '@nestjs/common';
import { ROLES } from '../../src/common/constants';

describe('AuditService', () => {
  let service: AuditService;

  const mockAuditRepository = {
    findAuditLogs: jest.fn(),
    findAuditLogsForExport: jest.fn(),
  };

  // Mock de TypeORM DataSource
  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockUserRepo),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuditService(
      mockAuditRepository as any,
      mockDataSource as any,
    );
  });

  // ─────────────────────────────────────────────
  // VALIDATE ADMIN (implícito vía métodos públicos)
  // ─────────────────────────────────────────────

  it('should throw if user is not admin', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: '1',
      role: 'USER',
    });

    await expect(
      service.getAuditLogs({ adminUserId: '1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw if user not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getAuditLogs({ adminUserId: '1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ─────────────────────────────────────────────
  // GET AUDIT LOGS
  // ─────────────────────────────────────────────

  it('should return audit logs successfully', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditLogs.mockResolvedValue({
      logs: [
        {
          auditId: 'a1',
          tableName: 'users',
          operation: 'INSERT',
          userId: 'u1',
          recordId: 'r1',
          changedAt: new Date(),
          oldData: { old: true },
          newData: { new: true },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const result = await service.getAuditLogs({
      adminUserId: 'admin',
    });

    expect(result.logs.length).toBe(1);
    expect(result.totalRecords).toBe(1);
    expect(result.logs[0].oldData).toContain('{');
  });

  // ─────────────────────────────────────────────
  // EXPORT AUDIT LOGS (CSV)
  // ─────────────────────────────────────────────

  it('should export audit logs as CSV', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditLogsForExport.mockResolvedValue([
      {
        auditId: 'a1',
        tableName: 'users',
        operation: 'UPDATE',
        userId: 'u1',
        recordId: 'r1',
        changedAt: new Date(),
      },
    ]);

    const result = await service.exportAuditLogs({
      adminUserId: 'admin',
      format: 'csv',
    });

    const csvContent = result.file.toString();

    expect(result.file_name).toBe('audit_report.csv');
    expect(csvContent).toContain('audit_id');
    expect(csvContent).toContain('a1');
  });

  // ─────────────────────────────────────────────
  // EXPORT AUDIT LOGS (JSON fallback)
  // ─────────────────────────────────────────────

  it('should export audit logs as JSON when format not csv', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    const logs = [
      {
        auditId: 'a1',
        tableName: 'users',
        operation: 'DELETE',
        userId: 'u1',
        recordId: 'r1',
        changedAt: new Date(),
      },
    ];

    mockAuditRepository.findAuditLogsForExport.mockResolvedValue(logs);

    const result = await service.exportAuditLogs({
      adminUserId: 'admin',
      format: 'json',
    });

    expect(result.file_name).toBe('audit_report.json');
    expect(result.file.toString()).toContain('a1');
  });

  // ─────────────────────────────────────────────
  // EDGE: export sin logs
  // ─────────────────────────────────────────────

  it('should handle empty export logs', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditLogsForExport.mockResolvedValue([]);

    const result = await service.exportAuditLogs({
      adminUserId: 'admin',
      format: 'csv',
    });

    const csv = result.file.toString();

    expect(csv).toContain('audit_id'); // header existe
  });
});