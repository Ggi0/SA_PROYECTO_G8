import { Injectable } from '@nestjs/common';

interface RequestMetric {
  count: number;
  durationSumSeconds: number;
}

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, RequestMetric>();
  private readonly startedAt = Date.now();

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const normalizedMethod = this.sanitizeLabel(method || 'UNKNOWN');
    const normalizedRoute = this.normalizeRoute(route || '/');
    const normalizedStatus = String(statusCode || 0);
    const key = `${normalizedMethod}|${normalizedRoute}|${normalizedStatus}`;

    const current = this.requests.get(key) || {
      count: 0,
      durationSumSeconds: 0,
    };

    current.count += 1;
    current.durationSumSeconds += durationSeconds;
    this.requests.set(key, current);
  }

  renderPrometheusMetrics(): string {
    const lines: string[] = [];
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    lines.push(
      '# HELP quetxal_api_gateway_uptime_seconds Tiempo de vida del API Gateway en segundos.',
    );
    lines.push('# TYPE quetxal_api_gateway_uptime_seconds gauge');
    lines.push(`quetxal_api_gateway_uptime_seconds ${uptimeSeconds}`);

    lines.push(
      '# HELP quetxal_api_gateway_memory_heap_used_bytes Memoria heap utilizada por el API Gateway.',
    );
    lines.push('# TYPE quetxal_api_gateway_memory_heap_used_bytes gauge');
    lines.push(`quetxal_api_gateway_memory_heap_used_bytes ${memory.heapUsed}`);

    lines.push(
      '# HELP quetxal_api_gateway_http_requests_total Total de solicitudes HTTP atendidas por el API Gateway.',
    );
    lines.push('# TYPE quetxal_api_gateway_http_requests_total counter');

    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');

      lines.push(
        `quetxal_api_gateway_http_requests_total{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.count}`,
      );
    }

    lines.push(
      '# HELP quetxal_api_gateway_http_request_duration_seconds_sum Suma de duración de solicitudes HTTP en segundos.',
    );
    lines.push(
      '# TYPE quetxal_api_gateway_http_request_duration_seconds_sum counter',
    );

    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');

      lines.push(
        `quetxal_api_gateway_http_request_duration_seconds_sum{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.durationSumSeconds.toFixed(6)}`,
      );
    }

    lines.push(
      '# HELP quetxal_api_gateway_http_request_duration_seconds_count Cantidad de solicitudes consideradas para la duración.',
    );
    lines.push(
      '# TYPE quetxal_api_gateway_http_request_duration_seconds_count counter',
    );

    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');

      lines.push(
        `quetxal_api_gateway_http_request_duration_seconds_count{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.count}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private normalizeRoute(route: string): string {
    const cleanRoute = route.split('?')[0] || '/';
    return this.sanitizeLabel(cleanRoute.replace(/[0-9a-fA-F-]{8,}/g, ':id'));
  }

  private sanitizeLabel(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '');
  }
}