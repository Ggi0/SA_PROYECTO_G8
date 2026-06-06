import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';



async function bootstrap() {
  // Creamos el contexto principal de Nest
  const app = await NestFactory.create(AppModule);

  // Obtenemos variables del entorno
  const configService = app.get(ConfigService);

  // Convertimos la app en microservicio gRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(process.cwd(), 'src/proto/auth.proto'),      
      url: `${configService.get<string>('GRPC_HOST')}:${configService.get<string>('GRPC_PORT')}`,
    },
  });

  // Iniciamos el microservicio
  await app.startAllMicroservices();

  console.log('[microsevice] Auth Service gRPC vivo');
}

bootstrap();
