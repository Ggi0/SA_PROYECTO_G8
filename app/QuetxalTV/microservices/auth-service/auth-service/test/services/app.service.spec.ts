// test/app.service.spec.ts

import { AppService } from '../../src/app.service';

describe('AppService', () => {
  let service: AppService;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AppService(mockDataSource as any);
  });

  // ─────────────────────────────────────────
  // HEALTH LIVE
  // ─────────────────────────────────────────
  it('should return liveness OK', () => {
    const result = service.healthLive();

    expect(result).toEqual({
      status: 'OK',
      message: 'Service is alive',
    });
  });

  // ─────────────────────────────────────────
  // HEALTH READY - SUCCESS
  // ─────────────────────────────────────────
  it('should return ready OK when DB responds', async () => {
    mockDataSource.query.mockResolvedValue([1]);

    const result = await service.healthReady();

    expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({
      status: 'OK',
      message: 'Service is ready (DB connected)',
    });
  });

  // ─────────────────────────────────────────
  // HEALTH READY - FAILURE
  // ─────────────────────────────────────────
  it('should return ERROR when DB fails', async () => {
    mockDataSource.query.mockRejectedValue(new Error('DB error'));

    const result = await service.healthReady();

    expect(result).toEqual({
      status: 'ERROR',
      message: 'Database not connected',
    });
  });
});
