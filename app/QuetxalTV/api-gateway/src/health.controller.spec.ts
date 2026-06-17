import { of } from 'rxjs';
import { HealthController } from './health.controller';
import { HistorialService } from './historial/historial.service';

describe('HealthController', () => {
    let controller: HealthController;

  const historialServiceMock = {
    healthReady: jest.fn().mockReturnValue(
      of({
        success: true,
        status: 'READY',
        service: 'historial-service',
        message: 'Historial service está listo y conectado a la base de datos',
      }),
    ),
  } as unknown as HistorialService;

  beforeEach(() => {
    controller = new HealthController(historialServiceMock);
  });

  it('should return api gateway health status', () => {
    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway activo',
    });
  });

  it('should return live status', () => {
    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway está vivo',
    });
  });

  it('should return ready status', async () => {
    await expect(controller.ready()).resolves.toEqual({
      status: 'ready',
      service: 'api-gateway',
      message: 'API Gateway listo para recibir tráfico',
      checks: {
        historial: {
          success: true,
          status: 'READY',
          service: 'historial-service',
          message: 'Historial service está listo y conectado a la base de datos',
        },
      },
    });
  });
});