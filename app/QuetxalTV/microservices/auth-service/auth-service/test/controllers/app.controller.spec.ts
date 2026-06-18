// test/controllers/app.controller.spec.ts

import { AppController } from '../../src/app.controller';

describe('AppController (ROBUST)', () => {
  let controller: AppController;

  const mockAppService = {
    healthLive: jest.fn(),
    healthReady: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AppController(mockAppService as any);
  });

  // ─────────────────────────────────────────
  // HEALTH LIVE
  // ─────────────────────────────────────────
  it('should return liveness OK', () => {
    mockAppService.healthLive.mockReturnValue({
      status: 'OK',
      message: 'Service is alive',
    });

    const res = controller.healthLive();

    expect(res.status).toBe('OK');
    expect(res.message).toBe('Service is alive');
    expect(mockAppService.healthLive).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────
  // HEALTH READY - SUCCESS
  // ─────────────────────────────────────────
  it('should return readiness OK', async () => {
    mockAppService.healthReady.mockResolvedValue({
      status: 'OK',
      message: 'Service is ready',
    });

    const res = await controller.healthReady();

    expect(res.status).toBe('OK');
    expect(res.message).toContain('ready');
    expect(mockAppService.healthReady).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────
  // HEALTH READY - FAILURE
  // ─────────────────────────────────────────
  it('should propagate errors from healthReady', async () => {
    mockAppService.healthReady.mockRejectedValue(
      new Error('DB failure'),
    );

    await expect(controller.healthReady()).rejects.toThrow('DB failure');
  });
});