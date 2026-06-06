import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Carga .env globalmente
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Módulo de base de datos
    DatabaseModule,

    // Módulo de auth
    AuthModule,
  ],
})
export class AppModule {}