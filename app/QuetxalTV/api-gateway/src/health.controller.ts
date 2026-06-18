import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { HistorialService } from './historial/historial.service';

@Controller('health')
export class HealthController {
  constructor(private readonly historialService: HistorialService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway activo',
    };
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway está vivo',
    };
  }

  @Get('ready')
  async ready() {
    try {
      const historial = await lastValueFrom(this.historialService.healthReady());

      if (!historial.success) {
        throw new ServiceUnavailableException({
          status: 'not_ready',
          service: 'api-gateway',
          message: 'API Gateway no está listo',
          checks: {
            historial,
          },
        });
      }

      return {
        status: 'ready',
        service: 'api-gateway',
        message: 'API Gateway listo para recibir tráfico',
        checks: {
          historial,
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'api-gateway',
        message: 'API Gateway no está listo porque historial-service no respondió correctamente',
        checks: {
          historial: {
            success: false,
            status: 'NOT_READY',
            service: 'historial-service',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo validar historial-service',
          },
        },
      });
    }
  }
}