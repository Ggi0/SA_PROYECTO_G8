import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth.service';
import { AUTH_SERVICE_GRPC } from './auth.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE_GRPC,
        transport: Transport.GRPC,
        options: {
          url: process.env.AUTH_SERVICE_URL || 'localhost:50051',
          package: 'auth',
          // process.cwd() cuando corres desde dist/ apunta a la raíz del proyecto
          // __dirname en dist/ apunta a dist/auth/
          // Necesitamos llegar al proto — ponlo en dist/proto/ también
          protoPath: join(__dirname, '../proto/auth.proto'),
          //app/QuetxalTV/api-gateway/src/proto/auth.proto
          //app/QuetxalTV/api-gateway/src/auth/auth.module.ts
          loader: {
            keepCase: false,
          },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthGatewayService],
})
export class AuthModule {}