# Justificación de Herramientas de Pruebas - Quetxal TV

El proyecto utiliza varias herramientas de prueba según el tipo de componente. No se eligió una sola herramienta para todo, porque el sistema es políglota y tiene frontend, API Gateway, microservicios en varios lenguajes, smoke tests y pruebas de carga.

## Herramientas utilizadas

| Herramienta | Uso | Justificación |
|---|---|---|
| Jest | Pruebas unitarias en TypeScript/NestJS | Integración natural con Node.js, NestJS y cobertura. |
| Go test | Pruebas unitarias en servicios Go | Herramienta nativa de Go. |
| Pytest | Pruebas unitarias en servicios Python | Simple, flexible y compatible con cobertura. |
| Locust | Pruebas de carga HTTP | Simula usuarios concurrentes sobre endpoints reales. |
| Smoke tests Python | Validación rápida post-despliegue | Verifica disponibilidad básica de endpoints críticos. |

## Evidencia de uso en código

### Jest en API Gateway

Ruta: `app/QuetxalTV/api-gateway/package.json`

```json
{
  "name": "quetxal-api-gateway",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "start:dev": "ts-node src/main.ts",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.14.4",
    "@grpc/proto-loader": "^0.7.15",
    "@nestjs/common": "^11.1.24",
    "@nestjs/core": "^11.1.24",
    "@nestjs/microservices": "^11.1.26",
    "@nestjs/platform-express": "^11.1.24",
    "cookie-parser": "^1.4.7",
    "dotenv": "^17.4.2",
    "jsonwebtoken": "^9.0.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.19.42",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.3"
  }
}
```

### Jest en Auth Service

Ruta: `app/QuetxalTV/microservices/auth-service/auth-service/package.json`

```json
{
  "name": "auth-service",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build && cp -r src/proto dist/",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.14.4",
    "@grpc/proto-loader": "^0.8.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/microservices": "^11.1.24",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/schedule": "^6.1.3",
    "@nestjs/typeorm": "^11.0.1",
    "pg": "^8.21.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^1.0.0",
    "uuid": "^14.0.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/cron": "^2.0.1",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^7.0.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
```

### Pruebas de carga con Locust

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

### Script local para ejecutar Locust

Ruta: `app/QuetxalTV/load-tests/run_local.ps1`

```powershell
$HostUrl = $env:LOCUST_HOST

if ([string]::IsNullOrWhiteSpace($HostUrl)) {
  $HostUrl = "http://localhost:3000"
}

locust -f .\locustfile.py --headless -u 25 -r 5 -t 2m --host $HostUrl --html .\results\locust_result.html
```

### Smoke tests

Ruta: `tests/smoke/smoke_test.py`

```python
import os
import sys

import requests


BASE = os.environ["BASE_URL"].rstrip("/")
TIMEOUT = 10

CHECKS = [
    ("GET", "/api/health", {200}),
    ("GET", "/", {200}),
    ("GET", "/api/catalog", {200, 401}),
    ("POST", "/api/auth/login", {200, 400, 401}),
]


def main() -> int:
    failures = 0
    for method, path, expected in CHECKS:
        try:
            response = requests.request(method, f"{BASE}{path}", timeout=TIMEOUT)
            ok = response.status_code in expected
            print(f"{'OK' if ok else 'FAIL'} {method} {path} -> {response.status_code}")
            failures += 0 if ok else 1
        except Exception as exc:
            failures += 1
            print(f"FAIL {method} {path} -> {exc}")

    print(f"Smoke result: {len(CHECKS) - failures}/{len(CHECKS)} OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
```

### Validación en GitHub Actions

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

La selección de herramientas de prueba cubre distintos niveles de calidad: pruebas unitarias por lenguaje, validación automatizada en CI, smoke tests después de despliegue y pruebas de carga con Locust. Esto permite validar lógica de negocio, disponibilidad y comportamiento bajo tráfico concurrente.
