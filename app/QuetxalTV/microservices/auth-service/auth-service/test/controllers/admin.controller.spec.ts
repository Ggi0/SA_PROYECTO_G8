import { AdminController } from '../../src/admin/admin.controller';

describe('AdminController (ROBUST)', () => {
  let controller: AdminController;

  const mockAuditService = {
    getAuditLogs: jest.fn(),
    exportAuditLogs: jest.fn(),
    getAllUsersWithProfiles: jest.fn(),
    getAuditEventLogs: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController(mockAuditService as any);
  });

  // ─────────────────────────────────────────────
  // GET AUDIT LOGS
  // ─────────────────────────────────────────────
  it('should return audit logs', async () => {
    const mockResponse = {
      logs: [{ auditId: '1', tableName: 'users', operation: 'INSERT' }],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
    };

    mockAuditService.getAuditLogs.mockResolvedValue(mockResponse);

    const data = { adminUserId: 'admin', page: 1, pageSize: 10 };

    const res = await controller.getAuditLogs(data);

    expect(res.logs.length).toBe(1);
    expect(res.totalRecords).toBe(1);
    expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // EXPORT AUDIT LOGS (CSV)
  // ─────────────────────────────────────────────
  it('should export audit logs (CSV)', async () => {
    const mockResponse = {
      file: Buffer.from('csv,data'),
      file_name: 'audit_report.csv',
    };

    mockAuditService.exportAuditLogs.mockResolvedValue(mockResponse);

    const data = { adminUserId: 'admin', format: 'csv' };

    const res = await controller.exportAuditLogs(data);

    expect(res.file_name).toBe('audit_report.csv');
    expect(res.file.toString()).toContain('csv');
    expect(mockAuditService.exportAuditLogs).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // EXPORT AUDIT LOGS (JSON)
  // ─────────────────────────────────────────────
  it('should export audit logs (JSON fallback)', async () => {
    const mockResponse = {
      file: Buffer.from(JSON.stringify([{ auditId: '1' }])),
      file_name: 'audit_report.json',
    };

    mockAuditService.exportAuditLogs.mockResolvedValue(mockResponse);

    const data = { adminUserId: 'admin', format: 'json' };

    const res = await controller.exportAuditLogs(data);

    expect(res.file_name).toBe('audit_report.json');
    expect(res.file.toString()).toContain('auditId');
  });

  // ─────────────────────────────────────────────
  // ✅ NEW: GET USERS WITH PROFILES
  // ─────────────────────────────────────────────
  it('should return users with profiles', async () => {
    const mockResponse = {
      users: [
        {
          userId: 'u1',
          email: 'test@test.com',
          role: 'client',
          isActive: true,
          profiles: [],
        },
      ],
      total: 1,
    };

    mockAuditService.getAllUsersWithProfiles.mockResolvedValue(mockResponse);

    const data = { adminUserId: 'admin' };

    const res = await controller.getAllUsersWithProfiles(data);

    expect(res.users.length).toBe(1);
    expect(res.total).toBe(1);
    expect(mockAuditService.getAllUsersWithProfiles).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // ✅ NEW: GET AUDIT EVENT LOGS
  // ─────────────────────────────────────────────
  it('should return audit event logs', async () => {
    const mockResponse = {
      logs: [
        {
          logId: '1',
          eventType: 'ACCOUNT_PURGED',
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
    };

    mockAuditService.getAuditEventLogs.mockResolvedValue(mockResponse);

    const data = { adminUserId: 'admin', page: 1 };

    const res = await controller.getAuditEventLogs(data);

    expect(res.logs.length).toBe(1);
    expect(res.totalRecords).toBe(1);
    expect(mockAuditService.getAuditEventLogs).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────
  it('should propagate errors from getAuditLogs', async () => {
    mockAuditService.getAuditLogs.mockRejectedValue(
      new Error('access denied'),
    );

    await expect(
      controller.getAuditLogs({ adminUserId: 'x' }),
    ).rejects.toThrow('access denied');
  });

  it('should propagate errors from exportAuditLogs', async () => {
    mockAuditService.exportAuditLogs.mockRejectedValue(
      new Error('export failed'),
    );

    await expect(
      controller.exportAuditLogs({ adminUserId: 'x' }),
    ).rejects.toThrow('export failed');
  });

  it('should propagate errors from getAllUsersWithProfiles', async () => {
    mockAuditService.getAllUsersWithProfiles.mockRejectedValue(
      new Error('fail users'),
    );

    await expect(
      controller.getAllUsersWithProfiles({ adminUserId: 'x' }),
    ).rejects.toThrow('fail users');
  });

  it('should propagate errors from getAuditEventLogs', async () => {
    mockAuditService.getAuditEventLogs.mockRejectedValue(
      new Error('fail events'),
    );

    await expect(
      controller.getAuditEventLogs({ adminUserId: 'x' }),
    ).rejects.toThrow('fail events');
  });
});