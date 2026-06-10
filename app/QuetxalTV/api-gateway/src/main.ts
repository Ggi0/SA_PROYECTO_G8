import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

    // Necesario para que @Req().cookies funcione en el controlador
  // El refresh_token viaja en cookie HttpOnly y se lee aquí
  app.use(cookieParser());


  app.enableCors({ origin: true, credentials: true });
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

void bootstrap();