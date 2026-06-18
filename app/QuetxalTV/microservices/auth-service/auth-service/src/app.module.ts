import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PerfilModule } from './perfil/perfil.module';
import { AdminModule } from './admin/admin.module';
import { HealthGrpcController } from './health-grpc.controller';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PerfilModule,
    AdminModule,
  ],
  controllers: [AppController, HealthGrpcController],
  providers: [AppService],
})
export class AppModule {}
