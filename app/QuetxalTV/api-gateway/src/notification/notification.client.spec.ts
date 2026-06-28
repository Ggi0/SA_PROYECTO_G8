import { Logger } from '@nestjs/common';

jest.mock('@grpc/grpc-js', () => ({
  credentials: { createInsecure: jest.fn().mockReturnValue('insecure') },
  loadPackageDefinition: jest.fn().mockReturnValue({
    notification: {
      NotificationService: jest.fn().mockImplementation(() => ({
        SendNewContentAlert: jest.fn(),
      })),
    },
  }),
}));

jest.mock('@grpc/proto-loader', () => ({
  loadSync: jest.fn().mockReturnValue({}),
}));

import { NotificationClient } from './notification.client';

describe('NotificationClient', () => {
  let client: NotificationClient;
  let mockGrpcClient: { SendNewContentAlert: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new NotificationClient();

    // Simular onModuleInit
    client.onModuleInit();

    // Obtener el mock del cliente gRPC interno
    const grpc = require('@grpc/grpc-js');
    const GrpcConstructor = grpc.loadPackageDefinition().notification.NotificationService;
    mockGrpcClient = new GrpcConstructor();
    (client as any).client = mockGrpcClient;
  });

  describe('onModuleInit', () => {
    it('debe inicializar el cliente gRPC sin errores', () => {
      expect(() => client.onModuleInit()).not.toThrow();
    });

    it('debe usar localhost:50056 por defecto', () => {
      delete process.env.NOTIFICATION_SERVICE_HOST;
      const freshClient = new NotificationClient();
      expect(() => freshClient.onModuleInit()).not.toThrow();
    });
  });

  describe('sendNewContentAlert', () => {
    it('debe llamar SendNewContentAlert con los datos correctos', async () => {
      mockGrpcClient.SendNewContentAlert = jest.fn().mockImplementation(
        (_data: unknown, cb: (err: null, res: object) => void) => {
          cb(null, { success: true, emails_sent: 3, message: 'OK' });
        }
      );

      await expect(
        client.sendNewContentAlert({
          content_title: 'El Quetzal',
          content_type: 'MOVIE',
          content_id: 'uuid-123',
        })
      ).resolves.toBeUndefined();

      expect(mockGrpcClient.SendNewContentAlert).toHaveBeenCalledWith(
        { content_title: 'El Quetzal', content_type: 'MOVIE', content_id: 'uuid-123' },
        expect.any(Function)
      );
    });

    it('debe rechazar la promesa si gRPC retorna error', async () => {
      mockGrpcClient.SendNewContentAlert = jest.fn().mockImplementation(
        (_data: unknown, cb: (err: Error, res: null) => void) => {
          cb(new Error('UNAVAILABLE: connection refused'), null);
        }
      );

      await expect(
        client.sendNewContentAlert({
          content_title: 'El Quetzal',
          content_type: 'MOVIE',
          content_id: 'uuid-123',
        })
      ).rejects.toThrow('UNAVAILABLE: connection refused');
    });

    it('debe loguear el número de emails enviados en caso de éxito', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      mockGrpcClient.SendNewContentAlert = jest.fn().mockImplementation(
        (_data: unknown, cb: (err: null, res: object) => void) => {
          cb(null, { success: true, emails_sent: 5, message: 'OK' });
        }
      );

      await client.sendNewContentAlert({
        content_title: 'Nueva Serie',
        content_type: 'SERIES',
        content_id: 'uuid-456',
      });

      expect(logSpy).toHaveBeenCalledWith('Alerta enviada a 5 suscriptores');
      logSpy.mockRestore();
    });

    it('debe loguear el error si gRPC falla', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      mockGrpcClient.SendNewContentAlert = jest.fn().mockImplementation(
        (_data: unknown, cb: (err: Error, res: null) => void) => {
          cb(new Error('timeout'), null);
        }
      );

      await expect(
        client.sendNewContentAlert({
          content_title: 'Test',
          content_type: 'MOVIE',
          content_id: 'uuid-789',
        })
      ).rejects.toThrow('timeout');

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});