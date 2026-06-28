# Observabilidad, Logs, Métricas y Pruebas de Carga - Quetxal TV

## Resumen

Se agregó la base de observabilidad y pruebas de carga para el proyecto **Quetxal TV**:

* Pruebas de carga ligera con **Locust**.
* Centralización de logs con **ELK Stack**.
* Recolección y visualización de métricas con **Prometheus y Grafana**.
* Métricas de contenedores con **cAdvisor**.
* Métricas del host con **node-exporter**.
* Logs estructurados en JSON desde el **API Gateway**.
* Endpoint `/metrics` compatible con Prometheus.

La implementación se realizó sin modificar los archivos principales de despliegue del proyecto, para evitar romper el flujo actual de CI/CD y Docker Compose.

---

## ¿Qué se agregó?

Se agregaron tres bloques principales:

1. Métricas y logs estructurados en el API Gateway.
2. Pruebas de carga con Locust.
3. Stack de observabilidad con Prometheus, Grafana y ELK.

---

#  Métricas y logs en API Gateway

## Archivos agregados/modificados

Se agregó la carpeta:

```txt
app/QuetxalTV/api-gateway/src/metrics/
```

Con los archivos:

```txt
metrics.service.ts
metrics.controller.ts
metrics.module.ts
observability.middleware.ts
```

También se modificaron:

```txt
app/QuetxalTV/api-gateway/src/app.module.ts
app/QuetxalTV/api-gateway/src/main.ts
```

---

## ¿Para qué sirve?

Esta parte permite que el API Gateway exponga métricas del sistema mediante el endpoint:

```txt
GET /metrics
```

Ese endpoint es consumido por Prometheus para recolectar información del comportamiento del API Gateway.

---

## ¿Qué métricas se generan?

El API Gateway genera métricas como:

```txt
quetxal_api_gateway_uptime_seconds
quetxal_api_gateway_memory_heap_used_bytes
quetxal_api_gateway_http_requests_total
quetxal_api_gateway_http_request_duration_seconds_sum
quetxal_api_gateway_http_request_duration_seconds_count
```

Estas métricas permiten observar:

* Tiempo de vida del API Gateway.
* Memoria utilizada.
* Cantidad de requests HTTP.
* Rutas consultadas.
* Métodos HTTP utilizados.
* Códigos de respuesta.
* Duración de las peticiones.

---

## ¿Cómo se manejan los logs?

Se agregó un middleware de observabilidad que registra cada request en formato JSON.

Cada log incluye información como:

```txt
timestamp
level
service
event
method
path
status_code
duration_ms
user_agent
ip
```

Ejemplo conceptual:

```json
{
  "timestamp": "2026-06-26T21:30:00.000Z",
  "level": "info",
  "service": "api-gateway",
  "event": "http_request",
  "method": "GET",
  "path": "/health/live",
  "status_code": 200,
  "duration_ms": 12
}
```

Esto facilita que los logs puedan ser procesados por Logstash y visualizados en Kibana.

---

#  Pruebas de carga con Locust

## Carpeta agregada

Se agregó la carpeta:

```txt
app/QuetxalTV/load-tests/
```

Con los archivos:

```txt
locustfile.py
requirements.txt
run_local.ps1
results/.gitkeep
results/locust_result.html
```

---

## ¿Para qué sirve Locust?

Locust se utiliza para simular usuarios concurrentes consumiendo rutas HTTP del sistema.

Locust simula tráfico hacia el **API Gateway**, ya que el Gateway es el punto de entrada principal del frontend hacia los microservicios.

---

## Endpoints utilizados

Los endpoints usados en la prueba son rutas existentes del API Gateway:

```txt
GET /health/live
GET /health/ready
GET /catalog
GET /catalog/search
GET /catalog/genres
GET /subscriptions/plans
GET /fx/rates
GET /historial/continue-watching/:profileId
```

Estas rutas fueron seleccionadas porque representan flujos importantes del sistema:

* Salud del API Gateway.
* Salud de dependencias.
* Consulta de catálogo.
* Búsqueda de contenido.
* Consulta de géneros.
* Consulta de planes.
* Consulta de tasas de cambio.
* Consulta de historial de reproducción.

---

## ¿Cómo se ejecuta?

Desde la carpeta:

```txt
app/QuetxalTV/load-tests/
```

Se activa el entorno virtual:

```powershell
.\venv\Scripts\Activate.ps1
```

Luego se ejecuta:

```powershell
.\run_local.ps1
```

Si PowerShell bloquea el script, se puede ejecutar así:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_local.ps1
```

---

## ¿Qué hace `run_local.ps1`?

El script ejecuta Locust en modo automático:

```powershell
locust -f .\locustfile.py --headless -u 25 -r 5 -t 2m --host http://localhost:3000 --html .\results\locust_result.html
```

Esto significa:

```txt
-u 25  -> simula 25 usuarios concurrentes
-r 5   -> crea 5 usuarios por segundo
-t 2m  -> ejecuta la prueba durante 2 minutos
--html -> genera un reporte HTML
```

---

## Reporte generado

El reporte se genera en:

```txt
app/QuetxalTV/load-tests/results/locust_result.html
```

Este archivo sirve como evidencia de la prueba de carga.

El reporte muestra:

* Total de requests.
* Requests por segundo.
* Tiempos de respuesta.
* Errores.
* Percentiles.
* Rutas con mayor carga.
* Estadísticas agregadas.

---


#  Stack de observabilidad

## Carpeta agregada

Se agregó la carpeta:

```txt
app/QuetxalTV/observability/
```

Con la siguiente estructura:

```txt
observability/
├── docker-compose.observability.yml
├── prometheus/
│   ├── prometheus.yml
│   └── rules/
│       └── alerts.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasource.yml
│   │   └── dashboards/
│   │       └── dashboard.yml
│   └── dashboards/
├── logstash/
│   ├── config/
│   │   └── logstash.yml
│   └── pipeline/
│       └── logstash.conf
└── filebeat/
    └── filebeat.yml
```

---

## Herramientas incluidas

El archivo:

```txt
app/QuetxalTV/observability/docker-compose.observability.yml
```

define los siguientes servicios:

```txt
Prometheus
Grafana
Elasticsearch
Logstash
Kibana
Filebeat
cAdvisor
node-exporter
```

---

#  Logs con ELK Stack

## ¿Qué es ELK?

ELK es un stack de observabilidad compuesto por:

```txt
Elasticsearch -> almacena logs
Logstash      -> procesa y transforma logs
Kibana        -> visualiza logs
```

Además, se utiliza:

```txt
Filebeat      -> recolecta logs de contenedores Docker
```

---

## ¿Cómo funciona en el proyecto?

El flujo es:

```txt
Contenedores Docker
        ↓
Filebeat
        ↓
Logstash
        ↓
Elasticsearch
        ↓
Kibana
```

Filebeat lee los logs generados por los contenedores Docker.

Logstash recibe esos logs, intenta procesar mensajes JSON y agrega campos como:

```txt
project = quetxal-tv
service_name
```

Elasticsearch almacena los logs en índices con el formato:

```txt
quetxal-tv-logs-YYYY.MM.dd
```

Kibana permite consultar y visualizar los logs.

---

## Archivos principales de logs

```txt
app/QuetxalTV/observability/filebeat/filebeat.yml
app/QuetxalTV/observability/logstash/config/logstash.yml
app/QuetxalTV/observability/logstash/pipeline/logstash.conf
```

---

## ¿Qué servicios generan logs?

Todos los servicios que se ejecuten como contenedores Docker y escriban logs por `stdout` o `stderr` pueden ser recolectados por Filebeat.

Adicionalmente, el API Gateway genera logs estructurados en JSON para facilitar búsquedas en Kibana.

---

# Métricas con Prometheus y Grafana

## ¿Qué hace Prometheus?

Prometheus recolecta métricas del sistema mediante scraping.

En este proyecto, Prometheus consulta:

```txt
API Gateway -> /metrics
cAdvisor
node-exporter
Prometheus
```

---

## ¿Qué hace Grafana?

Grafana permite visualizar las métricas recolectadas por Prometheus en dashboards.

Se puede utilizar para observar:

* Requests por ruta.
* Cantidad de errores.
* Tiempo de respuesta.
* Uso de memoria.
* Estado de contenedores.
* Consumo de CPU.
* Métricas del host.
* Métricas de red.

---

## Archivos principales de métricas

```txt
app/QuetxalTV/observability/prometheus/prometheus.yml
app/QuetxalTV/observability/prometheus/rules/alerts.yml
app/QuetxalTV/observability/grafana/provisioning/datasources/datasource.yml
app/QuetxalTV/observability/grafana/provisioning/dashboards/dashboard.yml
```

---

## Endpoint de métricas

El endpoint expuesto por el API Gateway es:

```txt
GET /metrics
```

Ejemplo local:

```powershell
Invoke-RestMethod http://localhost:3000/metrics
```

---

#  cAdvisor y node-exporter

## cAdvisor

cAdvisor obtiene métricas de contenedores Docker.

Permite observar:

* Uso de CPU por contenedor.
* Uso de memoria por contenedor.
* Red.
* Estado de contenedores.

---

## node-exporter

node-exporter obtiene métricas de la máquina host.

Permite observar:

* CPU del servidor.
* Memoria RAM.
* Disco.
* Red.
* Estado general del host.

---

# Validaciones realizadas

Se realizaron las siguientes validaciones:

## API Gateway

```powershell
cd app/QuetxalTV/api-gateway
npm run build
npm test
```

Resultado:

```txt
Build OK
Tests OK
3 test suites passed
21 tests passed
```

---

## Locust

Se ejecutó:

```powershell
cd app/QuetxalTV/load-tests
.\run_local.ps1
```

Resultado:

```txt
Locust ejecutado correctamente
Reporte HTML generado
```

Reporte:

```txt
app/QuetxalTV/load-tests/results/locust_result.html
```

---

## Docker Compose de observabilidad

Se validó la configuración con:

```powershell
cd app/QuetxalTV
docker compose -f docker-compose.local.yml -f observability/docker-compose.observability.yml config
```

Resultado:

```txt
Configuración YAML válida
```

---

# Cómo levantar el stack de observabilidad

Desde la carpeta:

```txt
app/QuetxalTV/
```

Ejecutar:

```powershell
docker compose -f docker-compose.local.yml -f observability/docker-compose.observability.yml up -d
```

---

## URLs locales

Una vez levantado el stack:

```txt
Prometheus -> http://localhost:9090
Grafana    -> http://localhost:3001
Kibana     -> http://localhost:5601
cAdvisor   -> http://localhost:8089
```

Credenciales de Grafana:

```txt
Usuario: admin
Password: admin
```

---

#  Conclusión de lo que se realizó

Para carga se utilizó Locust, simulando usuarios concurrentes que consumen rutas reales del API Gateway. Esto permite medir tiempos de respuesta, errores y comportamiento bajo tráfico.

Para logs se configuró ELK Stack. Filebeat recolecta logs de contenedores, Logstash los procesa, Elasticsearch los almacena y Kibana permite visualizarlos.

Para métricas se configuró Prometheus y Grafana. Prometheus recolecta métricas del endpoint `/metrics` del API Gateway, además de métricas de contenedores con cAdvisor y métricas del host con node-exporter. Grafana permite visualizar esa información en dashboards.


Detalle:

```txt
Pruebas de carga -> Locust
Logs             -> ELK Stack: Elasticsearch + Logstash + Kibana + Filebeat
Métricas         -> Prometheus + Grafana + cAdvisor + node-exporter
```
