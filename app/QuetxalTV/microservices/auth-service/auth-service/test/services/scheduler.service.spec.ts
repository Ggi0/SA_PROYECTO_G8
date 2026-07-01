import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from '../../src/scheduler/scheduler.service';
import { SchedulerRepository } from '../../src/scheduler/scheduler.repository';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let repo: jest.Mocked<SchedulerRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: SchedulerRepository,
          useValue: {
            deactivateInactiveUsers: jest.fn(),
            purgeDeactivatedUsers: jest.fn(),
            logAuditEvent: jest.fn().mockResolvedValue(undefined),
            logAuditTrail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(SchedulerService);
    repo = module.get(SchedulerRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // ✅ FASE 1
  // ─────────────────────────────────────────────

  it('FASE 1: no hace nada si count = 0', async () => {
    repo.deactivateInactiveUsers.mockResolvedValue({ count: 0, users: [] });

    await service.handleDeactivateInactiveUsers();

    expect(repo.deactivateInactiveUsers).toHaveBeenCalled();
    expect(repo.logAuditTrail).not.toHaveBeenCalled();
  });

  it('FASE 1: procesa usuarios correctamente', async () => {
    const users = [{
      user_id: 'u1',
      email: 'test@test.com',
      role: 'client',
      last_login_at: null,
      created_at: new Date(),
      deactivated_at: new Date(),
      deactivation_reason: 'inactividad',
    }];

    repo.deactivateInactiveUsers.mockResolvedValue({ count: 1, users });

    await service.handleDeactivateInactiveUsers();

    expect(repo.logAuditTrail).toHaveBeenCalledTimes(1);
    expect(repo.logAuditEvent).toHaveBeenCalled();

    // batch log ✅
    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      null,
      'CRON_DEACTIVATION_BATCH',
      expect.stringContaining('Batch'),
      expect.any(Object),
    );
  });

  it('FASE 1: rama con last_login_at diferente de null', async () => {
    const users = [{
      user_id: 'u2',
      email: 'login@test.com',
      role: 'client',
      last_login_at: new Date(), // 👈 cubre branch
      created_at: new Date(),
      deactivated_at: new Date(),
      deactivation_reason: 'test',
    }];

    repo.deactivateInactiveUsers.mockResolvedValue({ count: 1, users });

    await service.handleDeactivateInactiveUsers();

    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      'u2',
      'ACCOUNT_AUTO_DEACTIVATED',
      expect.any(String),
      expect.objectContaining({
        motivo: 'inactividad_post_login', // ✅ branch
      }),
    );
  });

  it('FASE 1: maneja error', async () => {
    repo.deactivateInactiveUsers.mockRejectedValue(new Error('fail'));

    await service.handleDeactivateInactiveUsers();

    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      null,
      'CRON_DEACTIVATION_ERROR',
      expect.stringContaining('fail'),
      expect.any(Object),
    );
  });

  // ─────────────────────────────────────────────
  // ✅ FASE 2
  // ─────────────────────────────────────────────

  it('FASE 2: no hace nada si count = 0', async () => {
    repo.purgeDeactivatedUsers.mockResolvedValue({ count: 0, users: [] });

    await service.handlePurgeDeactivatedUsers();

    expect(repo.purgeDeactivatedUsers).toHaveBeenCalled();
    expect(repo.logAuditTrail).not.toHaveBeenCalled();
  });

  it('FASE 2: procesa eliminación correctamente', async () => {
    const users = [{
      user_id: 'u1',
      email: 'delete@test.com',
      role: 'client',
      created_at: new Date(),
      last_login_at: null,
      deactivated_at: new Date(),
      deactivation_reason: 'test',
    }];

    repo.purgeDeactivatedUsers.mockResolvedValue({ count: 1, users });

    await service.handlePurgeDeactivatedUsers();

    expect(repo.logAuditTrail).toHaveBeenCalledTimes(1);
    expect(repo.logAuditEvent).toHaveBeenCalled();

    // batch log ✅
    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      null,
      'CRON_PURGE_BATCH',
      expect.stringContaining('Batch'),
      expect.any(Object),
    );
  });

  it('FASE 2: cubre audit event individual', async () => {
    const users = [{
      user_id: 'u3',
      email: 'purge@test.com',
      role: 'client',
      created_at: new Date(),
      last_login_at: null,
      deactivated_at: new Date(),
      deactivation_reason: 'test',
    }];

    repo.purgeDeactivatedUsers.mockResolvedValue({ count: 1, users });

    await service.handlePurgeDeactivatedUsers();

    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      null,
      'ACCOUNT_PURGED',
      expect.stringContaining('Cuenta eliminada'),
      expect.any(Object),
    );
  });

  it('FASE 2: maneja error', async () => {
    repo.purgeDeactivatedUsers.mockRejectedValue(new Error('purge fail'));

    await service.handlePurgeDeactivatedUsers();

    expect(repo.logAuditEvent).toHaveBeenCalledWith(
      null,
      'CRON_PURGE_ERROR',
      expect.stringContaining('purge fail'),
      expect.any(Object),
    );
  });
});
