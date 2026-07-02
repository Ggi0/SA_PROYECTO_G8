import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────
  // Liveness → solo ver si el servicio está vivo
  // ─────────────────────────────────────────
  healthLive() {
    return {
      status: 'OK',
      message: 'Service is alive',
    };
  }

  // ─────────────────────────────────────────
  // Readiness → verificar DB
  // ─────────────────────────────────────────
  async healthReady() {
    try {
      await this.dataSource.query('SELECT 1'); //  prueba real DB

      return {
        status: 'OK',
        message: 'Service is ready (DB connected)',
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: 'Database not connected',
      };
    }
  }
}