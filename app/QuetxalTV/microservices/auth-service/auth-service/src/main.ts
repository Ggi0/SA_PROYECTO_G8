import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { join } from 'path';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(process.cwd(), 'src/proto/auth.proto'),
          url: '0.0.0.0:50051',
        },
      },
    );

  const dataSource = app.get(DataSource);

  if (dataSource.isInitialized) {
    console.log('PostgreSQL conectado correctamente');
  } else {
    console.log(' PostgreSQL no está inicializado');
  }

  await app.listen();

  console.log('Auth Service gRPC escuchando en :50051');
}

bootstrap();