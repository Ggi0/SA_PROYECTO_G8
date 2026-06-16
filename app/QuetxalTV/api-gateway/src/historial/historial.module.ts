import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthJwtGuard } from '../common/guards/auth-jwt.guard';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'HISTORIAL_PACKAGE',
        useFactory: () => ({
          transport: Transport.GRPC,
          options: {
            package: 'historial',
            protoPath: join(__dirname, '../proto/historial.proto'),
            url: process.env.HISTORIAL_SERVICE_URL || 'localhost:50055',
          },
        }),
      },
    ]),
  ],
  controllers: [HistorialController],
  providers: [HistorialService, AuthJwtGuard],
})
export class HistorialModule {}