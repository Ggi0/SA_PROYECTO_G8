# Justificación de Toma de Decisiones - Fase 3 Quetxal TV

Durante la Fase 3 se agregaron elementos enfocados en despliegue, observabilidad, pruebas de carga, logs, métricas y validaciones automáticas. Las decisiones tomadas buscan que el sistema no solo funcione, sino que también pueda monitorearse, diagnosticarse y validarse después de cambios.

## Decisión: usar API Gateway como punto central

El API Gateway centraliza el acceso HTTP del frontend y evita exponer directamente los microservicios internos.

Ruta: `app/QuetxalTV/api-gateway/src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { HistorialModule } from './historial/historial.module';
import { HealthController } from './health.controller';
import { AuditModule } from './audit/audit.module';
import { DownloadModule } from './download/download.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [SubscriptionModule, FxModule, CatalogModule, AuthModule, HistorialModule, AuditModule, MetricsModule,DownloadModule],
  controllers: [HealthController],
})
export class AppModule {}
```

## Decisión: agregar métricas en `/metrics`

Se agregó un endpoint compatible con Prometheus para observar solicitudes, duración, estados HTTP, memoria y tiempo de vida del Gateway.

Ruta: `app/QuetxalTV/api-gateway/src/metrics/metrics.controller.ts`

```ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(this.metricsService.renderPrometheusMetrics());
  }
}
```

Ruta: `app/QuetxalTV/api-gateway/src/metrics/metrics.service.ts`

```ts
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
```

## Decisión: generar logs estructurados JSON

Se decidió generar logs en JSON para facilitar búsquedas por `service`, `event`, `method`, `path`, `status_code` y `duration_ms`.

Ruta: `app/QuetxalTV/api-gateway/src/metrics/observability.middleware.ts`

```ts
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
```

## Decisión: usar ELK para centralización de logs

Se configuró Filebeat para recolectar logs de contenedores, Logstash para procesarlos, Elasticsearch para almacenarlos y Kibana para visualizarlos.

Ruta: `app/QuetxalTV/observability/filebeat/filebeat.yml`

```yaml
filebeat.inputs:
  - type: filestream
    id: quetxal-tv-docker-logs
    enabled: true
    paths:
      - /var/lib/docker/containers/*/*.log
    parsers:
      - container: ~
    fields_under_root: true
    fields:
      project: quetxal-tv

processors:
  - add_docker_metadata:
      host: "unix:///var/run/docker.sock"
  - add_host_metadata: ~

output.logstash:
  hosts: ["logstash:5044"]
```

Ruta: `app/QuetxalTV/observability/logstash/pipeline/logstash.conf`

```
input {
  beats {
    port => 5044
  }

  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [container] and [container][name] {
    mutate {
      add_field => { "service_name" => "%{[container][name]}" }
    }
  }

  if [message] =~ /^\s*\{/ {
    json {
      source => "message"
      target => "app_log"
      skip_on_invalid_json => true
    }
  }

  mutate {
    add_field => { "project" => "quetxal-tv" }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "quetxal-tv-logs-%{+YYYY.MM.dd}"
  }

  stdout { codec => rubydebug }
}
```

## Decisión: usar Prometheus y Grafana para métricas

Prometheus recolecta métricas del API Gateway, cAdvisor, node-exporter y del propio Prometheus. Grafana permite visualizarlas.

Ruta: `app/QuetxalTV/observability/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ['prometheus:9090']

  - job_name: api-gateway
    metrics_path: /metrics
    static_configs:
      - targets: ['api-gateway:3000']

  - job_name: cadvisor
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: node-exporter
    static_configs:
      - targets: ['node-exporter:9100']
```

## Decisión: usar Locust para pruebas de carga

Locust se eligió para simular usuarios concurrentes HTTP contra endpoints reales del API Gateway.

Ruta: `app/QuetxalTV/load-tests/locustfile.py`

```python
import os
import random
from locust import HttpUser, between, task


def auth_headers():
    token = os.getenv("JWT_TOKEN", "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


class QuetxalTvUser(HttpUser):
    wait_time = between(1, 3)

    @task(5)
    def health_live(self):
        self.client.get("/health/live", name="GET /health/live")

    @task(5)
    def health_ready(self):
        self.client.get("/health/ready", name="GET /health/ready")

    @task(4)
    def catalog_home(self):
        self.client.get("/catalog?page=1&page_size=12", name="GET /catalog")

    @task(3)
    def catalog_search(self):
        term = random.choice(["matrix", "dark", "amor", "accion", "serie"])
        self.client.get(f"/catalog/search?q={term}", name="GET /catalog/search")

    @task(2)
    def genres(self):
        self.client.get("/catalog/genres", name="GET /catalog/genres")

    @task(2)
    def plans(self):
        self.client.get("/subscriptions/plans", name="GET /subscriptions/plans")

    @task(1)
    def fx_rates(self):
        self.client.get("/fx/rates", name="GET /fx/rates")

    @task(1)
    def authenticated_continue_watching(self):
        profile_id = os.getenv(
            "TEST_PROFILE_ID",
            "00000000-0000-0000-0000-000000000000",
        )

        headers = auth_headers()

        if not headers:
            return

        self.client.get(
            f"/historial/continue-watching/{profile_id}?limit=10",
            headers=headers,
            name="GET /historial/continue-watching/:profileId",
        )
```

## Decisión: mantener observabilidad separada del compose principal

La observabilidad se definió en un archivo adicional para no romper el entorno principal y poder levantarla solo cuando sea necesario.

Ruta: `app/QuetxalTV/observability/docker-compose.observability.yml`

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.55.1
    container_name: quetxaltv-prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.enable-lifecycle"
    volumes:
      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./observability/prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    depends_on:
      - cadvisor
      - node-exporter
    networks:
      - quetxal-network

  grafana:
    image: grafana/grafana:11.3.0
    container_name: quetxaltv-grafana
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./observability/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - quetxal-network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.49.1
    container_name: quetxaltv-cadvisor
    privileged: true
    ports:
      - "8089:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - quetxal-network

  node-exporter:
    image: prom/node-exporter:v1.8.2
    container_name: quetxaltv-node-exporter
    command:
      - "--path.rootfs=/host"
    pid: host
    volumes:
      - /:/host:ro,rslave
    ports:
      - "9100:9100"
    networks:
      - quetxal-network

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.3
    container_name: quetxaltv-elasticsearch
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - quetxal-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.15.3
    container_name: quetxaltv-logstash
    volumes:
      - ./observability/logstash/pipeline:/usr/share/logstash/pipeline:ro
      - ./observability/logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
    ports:
      - "5044:5044"
      - "5000:5000"
    depends_on:
      - elasticsearch
```

## Decisión: usar GitHub Actions para CI/CD

Se eligió GitHub Actions porque permite ejecutar pruebas por lenguaje y despliegues por rama.

Ruta: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline - Quetxal TV
on:
  push:
    branches: ['feature/**']
  pull_request:
    branches: [develop, release, main]
  workflow_call:
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test-go:
    name: "Go services (build + unit tests)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.25.0'
          cache: false
      - name: subscription-service
        working-directory: app/QuetxalTV/microservices/subscription-service
        run: |
          go build ./...
          go test ./internal/payments ./internal/plans ./internal/subscriptions -coverprofile=coverage.out -covermode=atomic -v
          grep -v "repository.go" coverage.out > coverage_unit.out
          COVERAGE=$(go tool cover -func=coverage_unit.out | awk '/total:/ {gsub(/%/, "", $3); print int($3)}')
          echo "Cobertura subscription-service (handler+service): ${COVERAGE}%"
          [ "$COVERAGE" -ge 75 ] || { echo "❌ Cobertura ${COVERAGE}% menor al 75%"; exit 1; }
      - name: catalogo-service
        working-directory: app/QuetxalTV/microservices/catalogo-service
        run: |
          go build ./...
          go test ./internal/catalog -coverprofile=coverage.out -covermode=atomic -v
          grep -v "internal/catalog/repository.go" coverage.out > coverage_unit.out
          COVERAGE=$(go tool cover -func=coverage_unit.out | grep 'total:' | awk '{print $3}' | tr -d '%')
          echo "Cobertura catalogo-service (handler+service): ${COVERAGE}%"
          if [ $(echo "$COVERAGE < 75" | bc -l) -eq 1 ]; then echo "❌ Cobertura ${COVERAGE}% menor al 75%"; exit 1; fi
  test-ts:
    name: "TypeScript services (≥75%)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: api-gateway
        working-directory: app/QuetxalTV/api-gateway
        env:
          JWT_SECRET: test-secret-ci
          JWT_ACCESS_SECRET: test-access-ci
        run: |
          npm ci --silent
          npx jest --coverage \
            --collectCoverageFrom=src/subscription/subscription.service.ts \
            --collectCoverageFrom=src/catalog/catalog.service.ts \
            --collectCoverageFrom=src/health.controller.ts \
            --coverageThreshold='{"global":{"lines":75}}' \
            --forceExit
      - name: auth-service
        working-directory: app/QuetxalTV/microservices/auth-service/auth-service
        env:
          JWT_SECRET: test-secret-ci
          JWT_ACCESS_SECRET: test-access-ci
        run: |
          npm ci --silent
          npm run test:cov
  test-python:
    name: "Python services (>=75%)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: fx-service
        working-directory: app/QuetxalTV/microservices/fx-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov pytest-asyncio -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "fx-service sin tests"; exit 1; }
          pytest tests/ --cov=src.services.fx_service --cov-fail-under=75 --cov-report=term-missing -v
      - name: notification-service
        working-directory: app/QuetxalTV/microservices/notification-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "notification-service sin tests"; exit 1; }
          pytest tests/ --cov=src.email --cov=src.db.repository --cov-fail-under=75 --cov-report=term-missing -v
      - name: historial-service
        working-directory: app/QuetxalTV/microservices/historial-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "historial-service sin tests"; exit 1; }
          pytest tests/ --cov=app.history.service --cov-fail-under=75 --cov-report=term-missing -v
      - name: download-service
        working-directory: app/QuetxalTV/microservices/download-service
        env:
          PYTHONPATH: src
```

## Conclusión

Las decisiones de Fase 3 fortalecen la operación del sistema: Locust valida carga, ELK centraliza logs, Prometheus/Grafana visualizan métricas, GitHub Actions automatiza calidad y el API Gateway actúa como punto observable de entrada.
