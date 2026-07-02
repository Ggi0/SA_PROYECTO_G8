import { AuditService } from '../../src/admin/admin.service';
import { ForbiddenException } from '@nestjs/common';
import { ROLES } from '../../src/common/constants';

describe('AuditService', () => {
  let service: AuditService;

  const mockAuditRepository = {
    findAuditLogs: jest.fn(),
    findAuditLogsForExport: jest.fn(),
    findAllUsersWithProfiles: jest.fn(),
    findAuditEventLogs: jest.fn(),
  };

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
  // VALIDATION
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
  // EXPORT CSV
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

    const csv = result.file.toString();

    expect(result.file_name).toBe('audit_report.csv');
    expect(csv).toContain('audit_id');
    expect(csv).toContain('a1');
  });

  // ─────────────────────────────────────────────
  // EXPORT JSON
  // ─────────────────────────────────────────────

  it('should export audit logs as JSON fallback', async () => {
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
    });

    expect(result.file_name).toBe('audit_report.json');
    expect(result.file.toString()).toContain('a1');
  });

  it('should handle empty CSV export', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditLogsForExport.mockResolvedValue([]);

    const result = await service.exportAuditLogs({
      adminUserId: 'admin',
      format: 'csv',
    });

    expect(result.file.toString()).toContain('audit_id');
  });

  // ─────────────────────────────────────────────
  // GET USERS WITH PROFILES ✅ (IMPORTANTE)
  // ─────────────────────────────────────────────

  it('should return users with profiles', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAllUsersWithProfiles.mockResolvedValue([
      {
        user_id: 'u1',
        email: 'test@test.com',
        role: 'client',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: new Date(),
        deactivated_at: null,
        deactivation_reason: null,
        profiles: [
          {
            profile_id: 'p1',
            display_name: 'perfil',
            avatar_url: null,
            is_kids_mode: true,
          },
        ],
      },
    ]);

    const result = await service.getAllUsersWithProfiles({
      adminUserId: 'admin',
    });

    expect(result.users.length).toBe(1);
    expect(result.users[0].profiles.length).toBe(1);
    expect(result.users[0].profiles[0].isKidsMode).toBe(true);
  });

  it('should handle users without profiles', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAllUsersWithProfiles.mockResolvedValue([
      {
        user_id: 'u1',
        email: 'test@test.com',
        role: 'client',
        is_active: true,
        created_at: null,
        updated_at: null,
        last_login_at: null,
        deactivated_at: null,
        deactivation_reason: null,
        profiles: null,
      },
    ]);

    const result = await service.getAllUsersWithProfiles({
      adminUserId: 'admin',
    });

    expect(result.users[0].profiles).toEqual([]);
    expect(result.users[0].createdAt).toBe('');
  });

  // ─────────────────────────────────────────────
  // GET AUDIT EVENTS ✅ (CLAVE PARA BRANCH)
  // ─────────────────────────────────────────────

  it('should return audit events', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditEventLogs.mockResolvedValue({
      logs: [
        {
          log_id: 1,
          user_id: null,
          event_type: 'TEST',
          description: 'desc',
          metadata: { a: 1 },
          created_at: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const result = await service.getAuditEventLogs({
      adminUserId: 'admin',
    });

    expect(result.logs[0].logId).toBe('1');
    expect(result.logs[0].metadata).toContain('{');
  });

  it('should handle empty metadata and dates', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 'admin',
      role: ROLES.ADMIN,
    });

    mockAuditRepository.findAuditEventLogs.mockResolvedValue({
      logs: [
        {
          log_id: 2,
          user_id: null,
          event_type: 'TEST',
          description: null,
          metadata: null,
          created_at: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const result = await service.getAuditEventLogs({
      adminUserId: 'admin',
    });

    expect(result.logs[0].metadata).toBe('{}');
    expect(result.logs[0].createdAt).toBe('');
  });
});