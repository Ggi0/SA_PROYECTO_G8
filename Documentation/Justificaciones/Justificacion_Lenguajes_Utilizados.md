# Justificación de Lenguajes Utilizados - Quetxal TV

Quetxal TV utiliza una arquitectura políglota. La decisión no fue usar un solo lenguaje para todo, sino seleccionar el lenguaje más adecuado para cada tipo de componente: interfaz de usuario, API Gateway, microservicios de negocio, servicios de apoyo, persistencia y automatización.

## Lenguajes seleccionados

| Lenguaje | Uso en el proyecto | Justificación |
|---|---|---|
| TypeScript | Frontend React, API Gateway y Auth Service | Tipado estático, compatibilidad con Node.js, NestJS y React. |
| Go | Catalog Service y Subscription Service | Alto rendimiento, binarios ligeros y buen soporte para gRPC. |
| Python | FX Service, Historial Service, Notification Service, Download Service y Locust | Rapidez de desarrollo, librerías para gRPC, testing, SMTP, Redis y pruebas de carga. |
| SQL / PL/pgSQL | Procedimientos, funciones, triggers y auditoría | Permite reglas transaccionales cerca de los datos y mantiene consistencia. |
| YAML | Docker Compose, Kubernetes y GitHub Actions | Formato declarativo para infraestructura y pipelines. |
| PowerShell | Script local de Locust | Facilita la ejecución en Windows, que fue el entorno usado para pruebas locales. |

## Evidencia de uso en código

### TypeScript en API Gateway

Ruta: `app/QuetxalTV/api-gateway/src/main.ts`

```ts
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


  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url === '/api') req.url = '/';
    else if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
  });


  app.enableCors({ origin: true, credentials: true });
```

### TypeScript y React en el frontend

Ruta: `app/frontend/src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import App from './App.tsx'
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
        <App />
         </QueryClientProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
```

### Go en Subscription Service

Ruta: `app/QuetxalTV/microservices/subscription-service/go.mod`

```go
module subscription-service

go 1.25.0

require (
	github.com/joho/godotenv v1.5.1
	github.com/jung-kurt/gofpdf v1.16.2
	github.com/lib/pq v1.10.9
	google.golang.org/grpc v1.81.1
	google.golang.org/protobuf v1.36.11
)

require (
	golang.org/x/net v0.51.0 
	golang.org/x/sys v0.42.0 
	golang.org/x/text v0.34.0 
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260226221140-a57be14db171 
)
```

### Python en FX Service

Ruta: `app/QuetxalTV/microservices/fx-service/requirements.txt`

```
grpcio>=1.64.0
grpcio-tools>=1.64.0
grpcio-health-checking>=1.64.0
protobuf>=6.0.0
httpx==0.27.0
python-dotenv==1.0.1
psycopg2-binary==2.9.9
redis==5.0.4
asyncpg==0.29.0
```

### SQL / PL/pgSQL en procedimientos transaccionales

Ruta: `app/QuetxalTV/database/subscription.sql`

```sql
--   Crea la suscripción (el trigger valida que no haya otra activa)
--   Registra el pago
-- Si cualquier paso falla, todo hace rollback.
-- El Subscription Service llama este SP después de confirmar el pago externo.

CREATE OR REPLACE PROCEDURE sp_create_subscription(
    p_user_id        UUID,
    p_plan_id        INT,
    p_amount_usd     NUMERIC(10,2),
    p_display_currency VARCHAR,
    p_display_amount   NUMERIC(10,2),
    p_gateway_ref    VARCHAR,
    p_payment_method VARCHAR,
    OUT p_subscription_id UUID,
    OUT p_payment_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_plan_price NUMERIC;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- 1. Validar plan
    SELECT price_usd INTO v_plan_price
    FROM plans
    WHERE plan_id = p_plan_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El plan % no existe o no está disponible.', p_plan_id;
    END IF;

    -- 2. Calcular fin de período (1 mes desde hoy)
    v_period_end := NOW() + INTERVAL '1 month';

    -- 3. Crear suscripción (el trigger trg_one_active_subscription valida aquí)
    INSERT INTO subscriptions(
        user_id, plan_id, status,
        current_period_start, current_period_end
    )
    VALUES (p_user_id, p_plan_id, 'ACTIVE', NOW(), v_period_end)
    RETURNING subscription_id INTO p_subscription_id;

    -- 4. Registrar el pago
    INSERT INTO payments(
        subscription_id, user_id, plan_id,
        amount_usd, display_currency, display_amount,
        status, gateway_ref, payment_method,
        period_start, period_end
    )
    VALUES (
        p_subscription_id, p_user_id, p_plan_id,
        p_amount_usd, p_display_currency, p_display_amount,
        'COMPLETED', p_gateway_ref, p_payment_method,
        NOW(), v_period_end
    )
    RETURNING payment_id INTO p_payment_id;

EXCEPTION
    WHEN OTHERS THEN
        
        RAISE;
END;
$$;


-- PROCEDIMIENTO: sp_cancel_subscription
```

### YAML en observabilidad

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

### PowerShell para ejecución local de Locust

Ruta: `app/QuetxalTV/load-tests/run_local.ps1`

```powershell
$HostUrl = $env:LOCUST_HOST

if ([string]::IsNullOrWhiteSpace($HostUrl)) {
  $HostUrl = "http://localhost:3000"
}

locust -f .\locustfile.py --headless -u 25 -r 5 -t 2m --host $HostUrl --html .\results\locust_result.html
```

## Conclusión

La selección de lenguajes permite dividir responsabilidades sin forzar una sola tecnología para todo el sistema. TypeScript favorece la integración frontend/backend en Node.js, Go fortalece servicios con lógica de negocio y comunicación gRPC, Python simplifica servicios de apoyo y pruebas, SQL asegura consistencia transaccional, YAML permite infraestructura declarativa y PowerShell facilita la operación local en Windows.
