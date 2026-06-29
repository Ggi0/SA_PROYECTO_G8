# Documentación: Prometheus y Grafana — Quetxal TV

**Proyecto Final — Software Avanzado, USAC**  
**Grupo 8**

| Carné | Nombre |
|---|---|
| 202100229 | Giovanni Saul Concohá Cax |
| 202200214 | Pablo Alejandro Marroquín Cutz |
| 201602619 | María de los Ángeles Paz de León |
| 202180003 | Ángel Isaías Mendoza Martínez |
| 202001814 | Naomi Rashel Yos Cujcuj |

---

## Índice

1. [¿Qué es Prometheus?](#1-qué-es-prometheus)
2. [¿Qué es Grafana?](#2-qué-es-grafana)
3. [Modelo de monitoreo: series temporales y scraping activo](#3-modelo-de-monitoreo-series-temporales-y-scraping-activo)
4. [Arquitectura de observabilidad en Quetxal TV](#4-arquitectura-de-observabilidad-en-quetxal-tv)
5. [Configuración paso a paso](#5-configuración-paso-a-paso)
   - [Paso 1: Infraestructura GCP con Terraform](#paso-1-infraestructura-gcp-con-terraform)
   - [Paso 2: Instrumentación de la app (API Gateway)](#paso-2-instrumentación-de-la-app-api-gateway)
   - [Paso 3: Despliegue del stack de observabilidad con Ansible + Docker Compose](#paso-3-despliegue-del-stack-de-observabilidad-con-ansible--docker-compose)
   - [Paso 4: Exporters — node_exporter y cAdvisor](#paso-4-exporters--node_exporter-y-cadvisor)
   - [Paso 5: Aprovisionamiento automático de dashboards en Grafana](#paso-5-aprovisionamiento-automático-de-dashboards-en-grafana)
6. [Dashboards de Grafana](#6-dashboards-de-grafana)
7. [Reglas de alerta en Prometheus](#7-reglas-de-alerta-en-prometheus)
8. [Capturas de pantalla del sistema en vivo](#8-capturas-de-pantalla-del-sistema-en-vivo)

---

## 1. ¿Qué es Prometheus?

**Prometheus** es un sistema de monitoreo y base de datos de series temporales (TSDB — *Time Series Database*) de código abierto, desarrollado originalmente por SoundCloud y actualmente mantenido por la Cloud Native Computing Foundation (CNCF).

### Características principales

| Característica | Descripción |
|---|---|
| **Modelo de datos** | Series temporales: cada métrica tiene un nombre + etiquetas (labels) + valor numérico + timestamp |
| **Recolección** | Activa (scraping): Prometheus va a buscar los datos, no los recibe pasivamente |
| **Almacenamiento** | Base de datos propia (TSDB) optimizada para datos numéricos con marca de tiempo |
| **Lenguaje de consulta** | PromQL (Prometheus Query Language) |
| **Retención** | Configurable; en Quetxal TV se usa la retención por defecto (15 días) |
| **Alertas** | Soporte para reglas de alerta definidas en archivos YAML (`alerts.yml`) |
| **Versión desplegada** | `prom/prometheus:v2.55.1` |

### Tipos de métricas que maneja

```
Counter   → valor que solo sube (ej: total de requests, total de errores)
Gauge     → valor que sube y baja (ej: memoria usada, uptime)
Histogram → distribución de valores (ej: duración de requests por rangos)
Summary   → similar a histogram, calcula percentiles en el cliente
```

---

## 2. ¿Qué es Grafana?

**Grafana** es una plataforma de visualización y análisis de datos de código abierto. **No almacena datos propios**: se conecta a fuentes de datos externas (como Prometheus) y construye dashboards interactivos sobre ellas.

### Características principales

| Característica | Descripción |
|---|---|
| **Rol** | Visualización exclusivamente — no recolecta ni almacena métricas |
| **Datasources** | Se conecta a Prometheus, InfluxDB, MySQL, Elasticsearch, entre otros |
| **Dashboards** | Paneles configurables con gráficas, estadísticas, tablas y alertas visuales |
| **Aprovisionamiento** | Permite importar dashboards como JSON o vía archivos de provisioning en disco |
| **Versión desplegada** | `grafana/grafana:11.3.0` |
| **Acceso en Quetxal TV** | `http://<monitor_public_ip>:3000` |
| **Credenciales** | `admin / admin` |

### Relación Prometheus ↔ Grafana

```
Prometheus = quien recolecta y guarda los datos
Grafana    = quien los visualiza en dashboards

Sin Prometheus, Grafana no tiene qué mostrar.
Sin Grafana, Prometheus solo expone datos en texto plano.
```

---

## 3. Modelo de monitoreo: series temporales y scraping activo

### 3.1 Series temporales

Una **serie temporal** es una secuencia de valores numéricos asociados a una marca de tiempo. Prometheus organiza cada métrica como:

```
<nombre_métrica>{label1="valor1", label2="valor2"} <valor> <timestamp>
```

**Ejemplo real del sistema Quetxal TV:**

```
quetxal_api_gateway_http_requests_total{method="GET",route="/catalog",status_code="200"} 142 1751165400
quetxal_api_gateway_http_requests_total{method="POST",route="/auth/login",status_code="200"} 37 1751165400
quetxal_api_gateway_uptime_seconds 3600 1751165400
quetxal_api_gateway_memory_heap_used_bytes 52428800 1751165400
```

Cada vez que Prometheus scrapeó el sistema, almacenó una nueva fila con el valor actual y el timestamp. Con el tiempo se construye una secuencia:

```
Timestamp    quetxal_api_gateway_http_requests_total{route="/catalog"}
────────────────────────────────────────────────────────────────────────
10:00:00     45
10:00:15     47
10:00:30     51
10:00:45     51   ← no hubo nuevas peticiones en ese intervalo
10:01:00     58
```

Esta secuencia es una **serie temporal** que Grafana puede graficar.

### 3.2 Scraping activo (modelo pull)

A diferencia de otros sistemas donde las aplicaciones *envían* métricas (modelo push), **Prometheus las va a buscar** (modelo pull). Esto se llama **scraping**.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CICLO DE SCRAPING (cada 15s)                      │
│                                                                      │
│  Prometheus ──── GET /metrics ────► API Gateway :3000                │
│                                                                      │
│  API Gateway responde con texto plano (formato Prometheus):          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ # HELP quetxal_api_gateway_uptime_seconds ...                │    │
│  │ # TYPE quetxal_api_gateway_uptime_seconds gauge              │    │
│  │ quetxal_api_gateway_uptime_seconds 3600                      │    │
│  │                                                              │    │
│  │ # HELP quetxal_api_gateway_http_requests_total ...           │    │
│  │ # TYPE quetxal_api_gateway_http_requests_total counter       │    │
│  │ quetxal_api_gateway_http_requests_total{method="GET",...} 47 │    │
│  │                                                              │    │
│  │ # HELP quetxal_api_gateway_memory_heap_used_bytes ...        │    │
│  │ quetxal_api_gateway_memory_heap_used_bytes 52428800          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Prometheus guarda cada valor con su timestamp en TSDB               │
│                                                                      │
│  Prometheus ──── GET /metrics ────► cAdvisor :8080                   │
│  Prometheus ──── GET /metrics ────► node-exporter :9100              │
│  Prometheus ──── GET /metrics ────► prometheus :9090 (auto-monitoreo)│
└──────────────────────────────────────────────────────────────────────┘
```

### Ventajas del modelo pull

| Ventaja | Explicación |
|---|---|
| **Descubrimiento centralizado** | Prometheus sabe qué scrapeó y cuándo. Si un servicio cae, lo detecta automáticamente |
| **Control de carga** | Prometheus decide el intervalo; la app no necesita enviar datos constantemente |
| **Simplicidad en la app** | La app solo necesita exponer un endpoint HTTP `/metrics` con texto plano |
| **Diagnóstico fácil** | Se puede verificar el estado desde la UI de Prometheus en `http://<monitor>:9090/targets` |
| **Seguridad** | Las métricas internas no se exponen a internet si el firewall está bien configurado |

### 3.3 Aprovisionamiento de métricas en dashboards (Grafana)

Una vez que Prometheus tiene los datos almacenados, Grafana los consulta usando **PromQL** para construir visualizaciones:

```
Grafana (panel)  ──── query PromQL ────►  Prometheus
                 ◄─── resultado JSON ────  Prometheus

Grafana dibuja el gráfico con los datos recibidos
```

El aprovisionamiento en Quetxal TV es **automático vía archivos en disco**:

- **`datasource.yml`** → define que Prometheus en `http://prometheus:9090` es el datasource por defecto
- **`dashboard.yml`** → le indica a Grafana que escanee `/var/lib/grafana/dashboards` en busca de JSON
- Los archivos JSON en esa carpeta se cargan automáticamente como dashboards al iniciar Grafana

---

## 4. Arquitectura de observabilidad en Quetxal TV

```
╔═══════════════════════════════════════════════════════════════════════════╗
║               ARQUITECTURA DE OBSERVABILIDAD — QUETXAL TV                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │                  GCP VM: quetxal-dev-vm  (Docker Compose)           │  ║
║  │                                                                     │  ║
║  │  API Gateway (NestJS :3000)                                         │  ║
║  │  ├─ metrics.service.ts  → acumula métricas HTTP en memoria          │  ║
║  │  ├─ observability.middleware.ts → intercepta cada request           │  ║
║  │  └─ GET /metrics → serializa métricas en formato Prometheus         │  ║
║  │                                                                     │  ║
║  │  Microservicios: auth, catalog, subscription, fx,                   │  ║
║  │  historial, notification, download  (gRPC internos)                 │  ║
║  │                                                                     │  ║
║  │  node_exporter :9100 (network_mode: host)                           │  ║
║  │  → métricas del SO de la VM dev                                     │  ║
║  └───────────────────────────┬─────────────────────────────────────────┘  ║
║                              │ scrape por IP privada VPC                  ║
║                              │ (10.10.0.8:3000 y 10.10.0.8:9100)         ║
║                              │                                            ║
║  ┌───────────────────────────▼─────────────────────────────────────────┐  ║
║  │             GCP VM: quetxal-monitor-vm  (Docker Compose)            │  ║
║  │                                                                     │  ║
║  │  ┌────────────────────┐   ┌──────────────────────────────────────┐  │  ║
║  │  │    Prometheus       │   │  Grafana                             │  │  ║
║  │  │    :9090           │   │  :3000                               │  │  ║
║  │  │                    │   │                                      │  │  ║
║  │  │  Scrape targets:   │   │  Datasource: Prometheus              │  │  ║
║  │  │  - api-gateway:3000│◄──│  Dashboards: Quetxal TV             │  │  ║
║  │  │  - cadvisor:8080   │   │  Provisioning: vía archivos YAML     │  │  ║
║  │  │  - node-exporter   │   └──────────────────────────────────────┘  │  ║
║  │  │    :9100           │                                             │  ║
║  │  │  - prometheus:9090 │   ┌──────────────────────────────────────┐  │  ║
║  │  └────────────────────┘   │  cAdvisor :8089                      │  │  ║
║  │                           │  → métricas de todos los contenedores │  │  ║
║  │                           └──────────────────────────────────────┘  │  ║
║  │                                                                     │  ║
║  │  node-exporter :9100 → métricas del SO de la VM monitor            │  ║
║  │                                                                     │  ║
║  │  (También: ELK Stack — Elasticsearch, Logstash, Kibana, Filebeat)   │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Componentes y su función

| Componente | Dónde corre | Función |
|---|---|---|
| **MetricsService** (NestJS) | API Gateway (dev VM) | Acumula métricas HTTP en memoria y las serializa en formato Prometheus |
| **ObservabilityMiddleware** | API Gateway (dev VM) | Intercepta cada request: registra método, ruta, código HTTP y duración |
| **cAdvisor** | monitor VM | Expone métricas de CPU, memoria, red y disco de cada contenedor Docker |
| **node_exporter** | monitor VM + dev VM | Expone métricas del sistema operativo: CPU, RAM, disco, red |
| **Prometheus** | monitor VM (contenedor) | Scrapeó y almacena todas las métricas; evalúa reglas de alerta |
| **Grafana** | monitor VM (contenedor) | Visualiza las métricas en dashboards interactivos |

### VMs en Google Cloud Platform

| VM | Tipo de máquina | Disco | Función |
|---|---|---|---|
| `quetxal-db-vm` | `e2-medium` | 30 GB | Bases de datos PostgreSQL de cada microservicio |
| `quetxal-monitor-vm` | `e2-standard-2` | 50 GB | Stack ELK + Prometheus + Grafana + Locust |
| `quetxal-dev-vm` | `e2-standard-2` | 40 GB | API Gateway + todos los microservicios (Docker Compose) |

---

## 5. Configuración paso a paso

### Paso 1: Infraestructura GCP con Terraform

Terraform crea las 3 máquinas virtuales en Google Cloud Platform y configura los firewalls necesarios para observabilidad.

**Archivo:** `infra/terraform/network.tf`

```hcl
# Puertos web del monitor (Grafana 3000, Prometheus 9090, Kibana 5601, cAdvisor 8089)
# Limitado a var.admin_cidr por seguridad (no expuesto a 0.0.0.0/0)
resource "google_compute_firewall" "allow_monitor" {
  name      = "quetxal-allow-monitor"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["5601", "3000", "9090", "8089"]
  }
  source_ranges = [var.admin_cidr]
  target_tags   = ["monitor"]
}

# Tráfico interno libre dentro de la VPC (GCP VMs <-> contenedores GKE)
# node-exporter (:9100), cAdvisor (:8080), api-gateway (:3000)
# son scrapeados por Prometheus a través de esta red interna
resource "google_compute_firewall" "allow_internal" {
  name      = "quetxal-allow-internal"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow { protocol = "tcp" }
  allow { protocol = "udp" }
  allow { protocol = "icmp" }
  source_ranges = ["10.10.0.0/24", "10.20.0.0/16", "10.30.0.0/16"]
}

# Logstash (5044): solo desde la red interna (Filebeat → Logstash)
resource "google_compute_firewall" "allow_logstash" {
  name      = "quetxal-allow-logstash"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["5044"]
  }
  source_ranges = ["10.20.0.0/16", "10.10.0.0/24"]
  target_tags   = ["monitor"]
}
```

**Archivo:** `infra/terraform/compute.tf` — VM de observabilidad

```hcl
# VM de Observabilidad: ELK + Prometheus + Grafana + Locust
resource "google_compute_instance" "monitor" {
  name         = "quetxal-monitor-vm"
  machine_type = "e2-standard-2"   # 2 vCPU, 8 GB RAM
  zone         = var.zone
  tags         = ["ssh", "monitor"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50  # 50 GB para almacenar índices ELK y datos Prometheus
    }
  }

  # Service Account con permisos cloud-platform
  # Permite autodescubrimiento de VMs via gce_sd_configs en el futuro
  service_account {
    email  = local.cicd_sa_email
    scopes = ["cloud-platform"]
  }
}
```

**Comandos para crear la infraestructura:**

```bash
cd infra/terraform

# 1. Inicializar providers y backend
terraform init

# 2. Previsualizar los cambios
terraform plan

# 3. Crear las VMs, VPC, Firewalls e IPs estáticas en GCP
terraform apply

# 4. Obtener las IPs generadas (necesarias para Ansible)
terraform output
```

**Output de ejemplo:**
```
db_public_ip       = "34.123.45.67"
db_private_ip      = "10.10.0.10"
monitor_public_ip  = "34.132.100.200"
monitor_private_ip = "10.10.0.9"
dev_public_ip      = "34.134.50.30"
dev_private_ip     = "10.10.0.8"

ansible_inventory = <<EOT
  [db]
  quetxal-db-vm ansible_host=34.123.45.67 private_ip=10.10.0.10

  [monitor]
  quetxal-monitor-vm ansible_host=34.132.100.200 private_ip=10.10.0.9

  [dev]
  quetxal-dev-vm ansible_host=34.134.50.30 private_ip=10.10.0.8

  [all:vars]
  ansible_user=ubuntu
  ansible_python_interpreter=/usr/bin/python3
EOT
```

---

### Paso 2: Instrumentación de la app (API Gateway)

El API Gateway expone métricas en formato Prometheus mediante una implementación personalizada en NestJS, sin depender de librerías externas como `prom-client`.

**Archivo:** `app/QuetxalTV/api-gateway/src/metrics/metrics.service.ts`

```typescript
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
    const key = `${method}|${this.normalizeRoute(route)}|${statusCode}`;
    const current = this.requests.get(key) || { count: 0, durationSumSeconds: 0 };
    current.count += 1;
    current.durationSumSeconds += durationSeconds;
    this.requests.set(key, current);
  }

  renderPrometheusMetrics(): string {
    const lines: string[] = [];
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    // Gauge: tiempo de vida del API Gateway
    lines.push('# HELP quetxal_api_gateway_uptime_seconds Tiempo de vida del API Gateway.');
    lines.push('# TYPE quetxal_api_gateway_uptime_seconds gauge');
    lines.push(`quetxal_api_gateway_uptime_seconds ${uptimeSeconds}`);

    // Gauge: memoria heap usada
    lines.push('# HELP quetxal_api_gateway_memory_heap_used_bytes Memoria heap utilizada.');
    lines.push('# TYPE quetxal_api_gateway_memory_heap_used_bytes gauge');
    lines.push(`quetxal_api_gateway_memory_heap_used_bytes ${memory.heapUsed}`);

    // Counter: total de requests HTTP
    lines.push('# HELP quetxal_api_gateway_http_requests_total Total de solicitudes HTTP.');
    lines.push('# TYPE quetxal_api_gateway_http_requests_total counter');
    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');
      lines.push(
        `quetxal_api_gateway_http_requests_total{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.count}`,
      );
    }

    // Counter: suma de duración de requests
    lines.push('# HELP quetxal_api_gateway_http_request_duration_seconds_sum Suma de duración.');
    lines.push('# TYPE quetxal_api_gateway_http_request_duration_seconds_sum counter');
    for (const [key, metric] of this.requests.entries()) {
      const [method, route, statusCode] = key.split('|');
      lines.push(
        `quetxal_api_gateway_http_request_duration_seconds_sum{method="${method}",route="${route}",status_code="${statusCode}"} ${metric.durationSumSeconds.toFixed(6)}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private normalizeRoute(route: string): string {
    const cleanRoute = route.split('?')[0] || '/';
    return cleanRoute.replace(/[0-9a-fA-F-]{8,}/g, ':id');
  }
}
```

**Archivo:** `app/QuetxalTV/api-gateway/src/metrics/observability.middleware.ts`

```typescript
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

export function createObservabilityMiddleware(metricsService: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const route = req.originalUrl || req.url || '/';

      // Registra la métrica en MetricsService
      metricsService.recordHttpRequest(req.method, route, res.statusCode, durationSeconds);

      // Emite log estructurado JSON (capturado por Filebeat → ELK)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        service: 'api-gateway',
        event: 'http_request',
        method: req.method,
        path: route,
        status_code: res.statusCode,
        duration_ms: Math.round(durationSeconds * 1000),
        user_agent: req.headers['user-agent'] || '',
        ip: req.ip,
      }));
    });

    next();
  };
}
```

**Archivo:** `app/QuetxalTV/api-gateway/src/main.ts`

```typescript
import { MetricsService } from './metrics/metrics.service';
import { createObservabilityMiddleware } from './metrics/observability.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Observabilidad: intercepta cada request para registrar métricas
  const metricsService = app.get(MetricsService);
  app.use(createObservabilityMiddleware(metricsService));

  // MetricsController expone GET /metrics para que Prometheus scrapeé
  // Acceso: http://api-gateway:3000/metrics

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}
```

**Verificación manual del endpoint:**
```bash
curl http://<dev_public_ip>:3000/metrics
```

Respuesta esperada (texto plano, formato Prometheus):
```
# HELP quetxal_api_gateway_uptime_seconds Tiempo de vida del API Gateway en segundos.
# TYPE quetxal_api_gateway_uptime_seconds gauge
quetxal_api_gateway_uptime_seconds 1847

# HELP quetxal_api_gateway_memory_heap_used_bytes Memoria heap utilizada por el API Gateway.
# TYPE quetxal_api_gateway_memory_heap_used_bytes gauge
quetxal_api_gateway_memory_heap_used_bytes 52428800

# HELP quetxal_api_gateway_http_requests_total Total de solicitudes HTTP atendidas por el API Gateway.
# TYPE quetxal_api_gateway_http_requests_total counter
quetxal_api_gateway_http_requests_total{method="GET",route="/catalog",status_code="200"} 142
quetxal_api_gateway_http_requests_total{method="GET",route="/health/live",status_code="200"} 38
quetxal_api_gateway_http_requests_total{method="POST",route="/auth/login",status_code="200"} 12

# HELP quetxal_api_gateway_http_request_duration_seconds_sum Suma de duración de solicitudes HTTP.
# TYPE quetxal_api_gateway_http_request_duration_seconds_sum counter
quetxal_api_gateway_http_request_duration_seconds_sum{method="GET",route="/catalog",status_code="200"} 2.847631
```

---

### Paso 3: Despliegue del stack de observabilidad con Ansible + Docker Compose

**Archivo:** `infra/ansible/monitor.yml`

El playbook automatiza la instalación completa del stack de observabilidad en la VM `quetxal-monitor-vm`:

```bash
# 1. Construir el inventario con las IPs generadas por Terraform
terraform -chdir=infra/terraform output -raw ansible_inventory > infra/ansible/inventory.ini

# 2. Ejecutar el playbook de observabilidad
cd infra/ansible
ansible-playbook -i inventory.ini monitor.yml
```

**¿Qué hace el playbook internamente?**

```
1. Instala dependencias base:
   apt: ca-certificates, curl, gnupg, python3-pip, python3-venv

2. Agrega el repositorio oficial de Docker y lo instala:
   docker-ce, docker-ce-cli, containerd.io, docker-compose-plugin

3. Instala el SDK de Docker para Python:
   pip install docker  (permite usar módulos community.docker en Ansible)

4. Configura vm.max_map_count=262144
   (requisito de Elasticsearch para no crashear)

5. Crea las carpetas de trabajo en /opt/observability/:
   /opt/observability/elk/      → stack ELK (Elasticsearch + Logstash + Kibana + Filebeat)
   /opt/observability/metrics/  → Prometheus + Grafana + cAdvisor + node-exporter
   /opt/observability/load/     → Locust para pruebas de carga

6. Copia los archivos de configuración:
   files/observability/metrics/ → /opt/observability/metrics/
   files/observability/elk/     → /opt/observability/elk/

7. Levanta Prometheus + Grafana + cAdvisor + node-exporter:
   community.docker.docker_compose_v2:
     project_src: /opt/observability/metrics

8. Levanta ELK Stack:
   community.docker.docker_compose_v2:
     project_src: /opt/observability/elk

9. Instala Locust en entorno virtual Python aislado:
   python3 -m venv /opt/observability/load/.venv
   pip install locust==2.31.6
   symlink: /usr/local/bin/locust
```

**Archivo de configuración de Docker Compose:**

`app/QuetxalTV/observability/docker-compose.observability.yml`

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
    depends_on: [cadvisor, node-exporter]
    networks: [quetxal-network]

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
      - "3001:3000"    # Grafana en 3001 (3000 lo usa el API Gateway en dev)
    depends_on: [prometheus]
    networks: [quetxal-network]

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.49.1
    container_name: quetxaltv-cadvisor
    privileged: true
    ports: ["8089:8080"]
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks: [quetxal-network]

  node-exporter:
    image: prom/node-exporter:v1.8.2
    container_name: quetxaltv-node-exporter
    command: ["--path.rootfs=/host"]
    pid: host
    volumes: ["/:/host:ro,rslave"]
    ports: ["9100:9100"]
    networks: [quetxal-network]
```

**Configuración de scraping:**

`app/QuetxalTV/observability/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s       # Prometheus scrapeó cada 15 segundos
  evaluation_interval: 15s   # Evalúa reglas de alerta cada 15 segundos

rule_files:
  - /etc/prometheus/rules/*.yml   # Carga todas las reglas de alerta

scrape_configs:
  # Auto-monitoreo de Prometheus
  - job_name: prometheus
    static_configs:
      - targets: ['prometheus:9090']

  # Métricas de la aplicación (API Gateway NestJS)
  # Expone las métricas personalizadas quetxal_api_gateway_*
  - job_name: api-gateway
    metrics_path: /metrics
    static_configs:
      - targets: ['api-gateway:3000']

  # Métricas de todos los contenedores Docker (CPU, RAM, red, disco)
  - job_name: cadvisor
    static_configs:
      - targets: ['cadvisor:8080']

  # Métricas del sistema operativo del servidor host
  - job_name: node-exporter
    static_configs:
      - targets: ['node-exporter:9100']
```

---

### Paso 4: Exporters — node_exporter y cAdvisor

#### node_exporter

El **node_exporter** es un agente que corre en el servidor y expone métricas del sistema operativo en el puerto `9100`. En Quetxal TV se despliega como contenedor Docker en dos VMs:

- **monitor VM**: corre dentro del stack Docker Compose de observabilidad
- **dev VM**: instalado por el playbook `dev.yml` en modo `network_mode: host`

**¿Qué métricas expone node_exporter?**

| Métrica | Qué mide |
|---|---|
| `node_cpu_seconds_total` | Tiempo de CPU por modo (idle, user, system, iowait) |
| `node_memory_MemAvailable_bytes` | RAM disponible en bytes |
| `node_filesystem_avail_bytes` | Espacio disponible en disco por punto de montaje |
| `node_network_receive_bytes_total` | Bytes recibidos por interfaz de red |
| `node_network_transmit_bytes_total` | Bytes enviados por interfaz de red |
| `node_load1` / `node_load5` | Carga del sistema en promedio de 1 y 5 minutos |
| `node_disk_read_bytes_total` | Bytes leídos del disco |

**Verificación:**
```bash
curl http://<monitor_public_ip>:9100/metrics | head -30
```

**Despliegue en la VM de desarrollo** (`infra/ansible/dev.yml`):

```yaml
- name: node_exporter (para que Prometheus descubra esta VM)
  community.docker.docker_container:
    name: node-exporter
    image: prom/node-exporter:v1.8.1
    network_mode: host        # usa la red del host, expone en la IP de la VM
    restart_policy: unless-stopped
```

#### cAdvisor

**cAdvisor** (*Container Advisor*) es un agente de Google que corre como contenedor privilegiado y recopila métricas de uso de recursos de todos los contenedores Docker del host.

**¿Qué métricas expone cAdvisor?**

| Métrica | Qué mide |
|---|---|
| `container_cpu_usage_seconds_total` | CPU acumulado por contenedor |
| `container_memory_working_set_bytes` | RAM activa por contenedor |
| `container_network_receive_bytes_total` | Bytes de red recibidos por contenedor |
| `container_fs_usage_bytes` | Uso de disco por contenedor |
| `container_last_seen` | Última vez que el contenedor fue detectado |

**¿Por qué usar IPs privadas de la VPC para scraping?**

El firewall `allow_internal` abre tráfico entre las VMs dentro de `10.10.0.0/24`. Los puertos de exporters (`:9100`, `:8080`) **no están expuestos a internet**. Prometheus accede a los exporters de otras VMs por IP privada, lo que es una práctica de seguridad: las métricas de hardware no se exponen públicamente.

---

### Paso 5: Aprovisionamiento automático de dashboards en Grafana

Grafana en Quetxal TV utiliza **provisioning automático vía archivos**: al iniciar el contenedor, Grafana lee los archivos de configuración montados como volúmenes y configura automáticamente el datasource y los dashboards.

#### Configuración del datasource

**Archivo:** `app/QuetxalTV/observability/grafana/provisioning/datasources/datasource.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090   # Prometheus dentro de la red Docker
    isDefault: true               # Usado por defecto en todos los paneles
```

#### Configuración del proveedor de dashboards

**Archivo:** `app/QuetxalTV/observability/grafana/provisioning/dashboards/dashboard.yml`

```yaml
apiVersion: 1

providers:
  - name: Quetxal TV Dashboards
    folder: Quetxal TV       # Carpeta que aparece en la UI de Grafana
    type: file
    options:
      path: /var/lib/grafana/dashboards   # Grafana escanea esta carpeta al iniciar
```

Los archivos JSON de dashboards se montan en esa ruta vía el volumen:
```yaml
- ./observability/grafana/dashboards:/var/lib/grafana/dashboards:ro
```

#### Importación manual (alternativa desde la UI de Grafana)

Si se prefiere importar dashboards manualmente sin reiniciar el contenedor:

1. Abrir `http://<monitor_public_ip>:3000`
2. Ingresar con `admin / admin`
3. Ir a **Dashboards → Import**
4. Subir el archivo JSON del dashboard o pegar su contenido
5. Seleccionar el datasource **Prometheus**
6. Hacer clic en **Import**

---

## 6. Dashboards de Grafana

### Panel 1 — Requests por ruta del API Gateway

Muestra el tráfico del API Gateway desglosado por método HTTP, ruta y código de respuesta.

```promql
rate(quetxal_api_gateway_http_requests_total[5m])
```

- **Tipo:** timeseries
- **Fuente:** MetricsService del API Gateway
- Permite detectar rutas con alto tráfico y errores 4xx/5xx en tiempo real

### Panel 2 — Tasa de errores HTTP (5xx)

Muestra la cantidad de errores del servidor en los últimos 5 minutos.

```promql
increase(quetxal_api_gateway_http_requests_total{status_code=~"5.."}[5m])
```

- **Tipo:** stat (con umbral de color: verde < 1, amarillo 1–10, rojo > 10)
- **Fuente:** MetricsService del API Gateway
- Activa la alerta `HighApiGatewayErrorRate` si supera 10 en 5 minutos

### Panel 3 — Latencia promedio del API Gateway

Calcula el tiempo promedio de respuesta del API Gateway.

```promql
rate(quetxal_api_gateway_http_request_duration_seconds_sum[5m])
/
rate(quetxal_api_gateway_http_request_duration_seconds_count[5m])
```

- **Tipo:** timeseries
- **Unidad:** segundos (Grafana convierte a ms automáticamente)
- **Fuente:** MetricsService del API Gateway

### Panel 4 — Uptime y memoria del API Gateway

Muestra el tiempo de vida y la memoria heap del proceso NestJS.

```promql
# Uptime en segundos
quetxal_api_gateway_uptime_seconds

# Memoria heap usada en bytes
quetxal_api_gateway_memory_heap_used_bytes
```

- **Tipo:** stat (valores instantáneos)
- Permite detectar reinicios del proceso (uptime vuelve a 0)

### Panel 5 — CPU y memoria por contenedor (cAdvisor)

Muestra el consumo de recursos de cada contenedor Docker en la VM.

```promql
# CPU por contenedor en millicores
rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 1000

# Memoria activa por contenedor
container_memory_working_set_bytes{name!=""}
```

- **Tipo:** timeseries
- **Fuente:** cAdvisor
- Una línea por contenedor (prometheus, grafana, api-gateway, microservicios, etc.)

### Panel 6 — Salud de los targets (UP/DOWN)

Indicador de disponibilidad de todos los servicios monitoreados.

```promql
up
```

- **Tipo:** stat (verde = 1 UP, rojo = 0 DOWN)
- **Fuente:** métrica interna de Prometheus
- Un indicador por target: `api-gateway`, `cadvisor`, `node-exporter`, `prometheus`
- Activa la alerta `ApiGatewayDown` si `up{job="api-gateway"} == 0` por más de 1 minuto

### Panel 7 — CPU del servidor (node_exporter)

Muestra el porcentaje de CPU utilizado en la VM.

```promql
100 - (avg by (instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
) * 100)
```

- **Tipo:** timeseries (ancho completo)
- **Fuente:** node_exporter
- **Unidad:** porcentaje (0–100%)

### Panel 8 — RAM disponible (node_exporter)

Muestra la memoria RAM libre en el servidor.

```promql
node_memory_MemAvailable_bytes
```

- **Tipo:** gauge
- **Fuente:** node_exporter
- **Unidad:** bytes (Grafana convierte a GB automáticamente)

---

## 7. Reglas de alerta en Prometheus

**Archivo:** `app/QuetxalTV/observability/prometheus/rules/alerts.yml`

```yaml
groups:
  - name: quetxal-tv-alerts
    rules:
      # Alerta crítica: el API Gateway dejó de responder
      - alert: ApiGatewayDown
        expr: up{job="api-gateway"} == 0
        for: 1m       # debe mantenerse caído 1 minuto antes de disparar
        labels:
          severity: critical
        annotations:
          summary: "API Gateway no está disponible"
          description: "Prometheus no puede consultar el endpoint /metrics del API Gateway."

      # Alerta de advertencia: alta tasa de errores 5xx
      - alert: HighApiGatewayErrorRate
        expr: increase(quetxal_api_gateway_http_requests_total{status_code=~"5.."}[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Alta cantidad de errores 5xx"
          description: "El API Gateway está registrando múltiples respuestas 5xx en los últimos 5 minutos."
```

Las alertas se pueden ver y verificar en: `http://<monitor_public_ip>:9090/alerts`

---

## 8. Capturas de pantalla del sistema en vivo

> **Instrucción:** Con el sistema desplegado en GCP, tomar capturas de cada sección y reemplazar los bloques `[Adjuntar captura: ...]` con las imágenes correspondientes usando la sintaxis `![descripción](ruta/a/imagen.png)`.

### 8.1 Prometheus — Targets UP/DOWN

Acceder a `http://<monitor_public_ip>:9090/targets` para verificar el estado de todos los scrape targets.

Se debe observar:
- `api-gateway` → **UP** (verde)
- `cadvisor` → **UP** (verde)
- `node-exporter` → **UP** (verde)
- `prometheus` → **UP** (verde)

```
[Adjuntar captura: prometheus_targets.png]
```

---

### 8.2 Prometheus — Explorador de métricas

Acceder a `http://<monitor_public_ip>:9090/graph` y ejecutar la consulta:

```promql
quetxal_api_gateway_http_requests_total
```

```
[Adjuntar captura: prometheus_metrics_explorer.png]
```

---

### 8.3 Grafana — Dashboard Quetxal TV — Vista general

Acceder a `http://<monitor_public_ip>:3000` → iniciar sesión con `admin / admin` → Dashboards → Quetxal TV

```
[Adjuntar captura: grafana_dashboard_general.png]
```

---

### 8.4 Panel: Requests por ruta del API Gateway

```
[Adjuntar captura: grafana_panel_requests.png]
```

---

### 8.5 Panel: CPU y memoria de contenedores (cAdvisor)

```
[Adjuntar captura: grafana_panel_cadvisor.png]
```

---

### 8.6 Panel: Salud de los targets (UP/DOWN)

```
[Adjuntar captura: grafana_panel_targets.png]
```

---

### 8.7 Panel: CPU del servidor (node_exporter)

```
[Adjuntar captura: grafana_panel_node_cpu.png]
```

---

### 8.8 Panel: Latencia del API Gateway

```
[Adjuntar captura: grafana_panel_latency.png]
```

---

## Resumen de URLs y puertos

| Servicio | URL | Puerto |
|---|---|---|
| **Grafana** | `http://<monitor_public_ip>:3000` | 3000 |
| **Prometheus** | `http://<monitor_public_ip>:9090` | 9090 |
| **cAdvisor** | `http://<monitor_public_ip>:8089` | 8089 |
| **Kibana** | `http://<monitor_public_ip>:5601` | 5601 |
| **API Gateway /metrics** | `http://<dev_public_ip>:3000/metrics` | 3000 |
| **node-exporter** | `http://<monitor_public_ip>:9100/metrics` | 9100 |

## Resumen de métricas personalizadas expuestas

| Métrica | Tipo | Labels | Descripción |
|---|---|---|---|
| `quetxal_api_gateway_uptime_seconds` | Gauge | — | Tiempo de vida del proceso NestJS en segundos |
| `quetxal_api_gateway_memory_heap_used_bytes` | Gauge | — | Memoria heap usada por el proceso Node.js |
| `quetxal_api_gateway_http_requests_total` | Counter | method, route, status_code | Total de requests HTTP procesadas |
| `quetxal_api_gateway_http_request_duration_seconds_sum` | Counter | method, route, status_code | Suma de duración de requests en segundos |
| `quetxal_api_gateway_http_request_duration_seconds_count` | Counter | method, route, status_code | Cantidad de requests consideradas para la duración |
