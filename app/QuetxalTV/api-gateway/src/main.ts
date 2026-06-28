import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics/metrics.service';
import { createObservabilityMiddleware } from './metrics/observability.middleware';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const metricsService = app.get(MetricsService);
  app.use(createObservabilityMiddleware(metricsService));


    // Necesario para que @Req().cookies funcione en el controlador
  // El refresh_token viaja en cookie HttpOnly y se lee aquí
  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url === '/api') req.url = '/';
    else if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
  });


  app.enableCors({ origin: true, credentials: true });
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

void bootstrap();
