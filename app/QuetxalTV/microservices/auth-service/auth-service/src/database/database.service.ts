import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  // Pool de conexiones reutilizable para PostgreSQL
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: Number(this.configService.get<string>('DB_PORT')),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
    });
  }

  async onModuleInit() {
    // Validamos conexión al arrancar el microservicio
    await this.pool.query('SELECT 1');
    console.log('Conexión a PostgreSQL lista');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  // Método genérico para ejecutar queries desde los repositories
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    const result = await this.pool.query(text, params);
    return { rows: result.rows };
  }
}