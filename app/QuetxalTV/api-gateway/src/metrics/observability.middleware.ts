import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

export function createObservabilityMiddleware(metricsService: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1_000_000_000;
      const route = req.originalUrl || req.url || '/';

      metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationSeconds,
      );

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level:
            res.statusCode >= 500
              ? 'error'
              : res.statusCode >= 400
                ? 'warn'
                : 'info',
          service: 'api-gateway',
          event: 'http_request',
          method: req.method,
          path: route,
          status_code: res.statusCode,
          duration_ms: Math.round(durationSeconds * 1000),
          user_agent: req.headers['user-agent'] || '',
          ip: req.ip,
        }),
      );
    });

    next();
  };
}