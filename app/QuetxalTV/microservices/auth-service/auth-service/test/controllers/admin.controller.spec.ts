// test/controllers/admin.controller.spec.ts

import { AdminController } from '../../src/admin/admin.controller';

describe('AdminController (ROBUST)', () => {
  let controller: AdminController;

  const mockAuditService = {
    getAuditLogs: jest.fn(),
    exportAuditLogs: jest.fn(),
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
      logs: [
        {
          auditId: '1',
          tableName: 'users',
          operation: 'INSERT',
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
    };

    mockAuditService.getAuditLogs.mockResolvedValue(mockResponse);

    const data = {
      adminUserId: 'admin',
      page: 1,
      pageSize: 10,
    };

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

    const data = {
      adminUserId: 'admin',
      format: 'csv',
    };

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

    const data = {
      adminUserId: 'admin',
      format: 'json',
    };

    const res = await controller.exportAuditLogs(data);

    expect(res.file_name).toBe('audit_report.json');
    expect(res.file.toString()).toContain('auditId');
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
});