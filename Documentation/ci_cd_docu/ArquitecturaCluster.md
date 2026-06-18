# Arquitectura del Clúster Kubernetes — QuetxalTV (GKE)

## 1. Visión General

QuetxalTV despliega su entorno de producción sobre un clúster de **Google Kubernetes Engine (GKE)** en la región `us-central1-a` del proyecto `quetxal-tv`. La elección de GKE como plataforma de orquestación responde al requisito de producción de la rama `release`: proporciona gestión nativa del Control Plane, actualizaciones automáticas, integración con los servicios de identidad de GCP mediante Workload Identity, y escalabilidad horizontal sin necesidad de gestionar la infraestructura subyacente del nodo maestro.

El clúster opera con el nombre `gke_quetxal-tv_us-central1-a_quetxal-tv-cluster` y su Control Plane es accesible en `34.72.14.159`. Toda la infraestructura del clúster se gestiona de forma declarativa mediante manifiestos YAML versionados en el repositorio, aplicados exclusivamente a través del pipeline de CD; los despliegues manuales mediante CLI están estrictamente prohibidos.


![](./image/Vista%20de%20Despliegue(Física)-Proyecto-F1%20-%20Página%201%20(2).png)
---

## 2. Distribución Física del Clúster

### 2.1 Nodo Worker

En su configuración actual, el clúster opera con **un único nodo worker** de la pool `default-pool`:

- **Nombre del nodo:** `gke-quetxal-tv-cluster-default-pool-74cf0124-jv0w`
- **Red interna (Pod CIDR):** `10.88.0.0/16`
- **Zona:** `us-central1-a`

Todos los Pods de la plataforma —microservicios, bases de datos, caché y frontend— corren sobre este nodo. La concentración en un único nodo es una decisión de diseño propia de la escala del proyecto académico; en un entorno empresarial real se distribuiría entre múltiples nodos en zonas de disponibilidad distintas.

### 2.2 Namespace de Aislamiento

La totalidad de los recursos de la aplicación está aislada dentro del Namespace `quetxal-tv-prod`, declarado en `k8s/namespace.yaml` con las etiquetas `app: quetxal-tv` y `environment: production`. El uso de un Namespace dedicado cumple dos objetivos: primero, aísla lógicamente los recursos de QuetxalTV del espacio de nombres por defecto y de los namespaces del sistema (`kube-system`, `gmp-system`, `ingress-nginx`), evitando colisiones de nombres; segundo, permite aplicar políticas de red, límites de recursos y controles de acceso a nivel de Namespace de manera uniforme.

### 2.3 Namespaces del Sistema

Además del Namespace de aplicación, el clúster mantiene los siguientes namespaces gestionados por GKE:

- **`kube-system`:** DNS (kube-dns), métricas (metrics-server), proxy, logging (fluentbit-gke), conectividad (konnectivity-agent) y almacenamiento (pdcsi-node).
- **`gmp-system`:** Google Managed Prometheus para recolección de métricas del clúster (collector, gmp-operator).
- **`gke-managed-cim`:** kube-state-metrics con autoescalado horizontal.
- **`ingress-nginx`:** Ingress Controller de NGINX (en estado de inicialización paralelo al GCE Ingress).

---

## 3. Recursos de Configuración del Clúster

### 3.1 ConfigMap

El `ConfigMap` denominado `quetxal-tv-config` centraliza toda la configuración no sensible de los microservicios. Contiene 16 claves que incluyen las URLs internas de comunicación entre servicios (basadas en nombres DNS de Kubernetes, no en IPs), los parámetros de conexión a Redis, la URL del bucket de GCS, y la configuración del servidor SMTP. Al declarar estas URLs como referencias a nombres de servicio Kubernetes (`auth-service:50051`, `catalogo-service:50052`, etc.), los microservicios son completamente agnósticos a las IPs internas del clúster, que son asignadas dinámicamente por el plano de control.

### 3.2 Secret

El `Secret` `quetxal-tv-secrets` (tipo `Opaque`) almacena 46 claves sensibles que incluyen los tokens JWT de autenticación y refresco, las credenciales de acceso a cada una de las seis bases de datos PostgreSQL, las claves de cuenta de servicio para GCS, las credenciales SMTP y la API key del servicio de tipos de cambio. Kubernetes almacena los Secrets cifrados en `etcd`, y los Pods los consumen mediante referencias `secretKeyRef` en las variables de entorno, garantizando que ningún valor sensible aparezca en texto plano en los manifiestos YAML del repositorio.

### 3.3 BackendConfig

El recurso `BackendConfig` `api-gateway-backendconfig` es específico de GKE y configura el health check que el balanceador de carga de GCP utiliza para determinar la disponibilidad del backend. Está configurado para realizar verificaciones HTTP contra el path `/health` en el puerto `3000` del api-gateway. Este recurso se referencia desde el Service del api-gateway mediante la anotación `cloud.google.com/backend-config`.

---

## 4. Punto de Acceso Externo: Ingress

### 4.1 Ingress Resource

El recurso `Ingress` denominado `quetxal-tv-ingress` es el **único punto de entrada externo** al clúster. Opera con la clase `GCE` (balanceador de carga de Google Cloud) y expone la IP pública `34.149.86.86` en el puerto 80. Ningún servicio de la plataforma está expuesto directamente con tipo `LoadBalancer` o `NodePort`; todos son de tipo `ClusterIP`, accesibles únicamente dentro del clúster o a través del Ingress.

Las reglas de enrutamiento del Ingress son:
- **Path `/`** → Service `frontend` en puerto 80: dirige el tráfico del navegador hacia la aplicación React.
- **Path `/api`** → Service `api-gateway` en puerto 3000: dirige todas las llamadas de API hacia el API Gateway, que actúa como punto de entrada unificado para los microservicios de backend.

Los Services `frontend` y `api-gateway` tienen la anotación `cloud.google.com/neg: '{"ingress": true}'`, que habilita los Network Endpoint Groups de GCP para un enrutamiento más eficiente directamente a los Pods, sin pasar por la capa de kube-proxy.

---

## 5. Pods de Microservicios y Lenguajes

### 5.1 Microservicios TypeScript / Node.js

**api-gateway** (`10.88.0.229`, puerto `3000/TCP`) actúa como la única interfaz entre el Ingress y los microservicios internos. Recibe peticiones HTTP/REST desde el frontend y las traduce a llamadas gRPC hacia los microservicios correspondientes. Consume el ConfigMap para conocer las URLs gRPC de cada servicio downstream. Sus Readiness y Liveness Probes verifican el endpoint HTTP `/health`, lo que garantiza que el Pod no recibe tráfico del Ingress hasta que haya establecido conexión con los servicios que depende.

**auth-service** (`10.88.0.230`, puerto `50051/TCP gRPC`) gestiona el ciclo completo de autenticación: registro de usuarios, inicio de sesión, validación y refresco de tokens JWT. Es invocado exclusivamente por el api-gateway mediante gRPC. Cuando se registra un nuevo usuario o se producen eventos de seguridad, el auth-service se comunica internamente con el notification-service para disparar emails transaccionales. Accede a su base de datos propia `auth-db` en `34.118.239.47:5432`.

### 5.2 Microservicios Go

**subscription-service** (`10.88.0.237`, puerto `50053/TCP gRPC`) administra los planes de suscripción, pagos y el ciclo de vida de las membresías de los usuarios. Mantiene una dependencia doble: consulta al fx-service para obtener tasas de cambio en tiempo real antes de procesar cobros en distintas monedas, y delega al notification-service el envío de confirmaciones de pago y alertas de renovación. Su base de datos `subscription-db` incluye un esquema de auditoría aplicado automáticamente por el Job de migración en cada release.

**catalogo-service** (`10.88.0.232`, puertos `50052/TCP gRPC` y `8082/TCP HTTP`) gestiona el catálogo de contenidos: películas, series y episodios disponibles en la plataforma. Expone dos interfaces: gRPC para las consultas del api-gateway y un endpoint HTTP en `8082` para operaciones de auditoría. Este servicio tiene acceso privilegiado al bucket de GCS `quetxal-tv-videos` para gestionar los archivos de video, acceso que se realiza sin claves JSON gracias al mecanismo de **Workload Identity**: el Pod corre con el ServiceAccount `catalogo-service-ksa`, que tiene anotada la cuenta de servicio de GCP `${GCP_SA_EMAIL}`, permitiéndole autenticarse ante Google Cloud Storage de forma transparente.

**fx-service** (`10.88.0.234`, puerto `50054/TCP gRPC`) es el servicio de tipos de cambio de divisas. Consulta la API externa `exchangerate-api.com` y cachea las respuestas en Redis (`10.88.0.36:6379`) con un TTL configurable (por defecto `3600` segundos). Al usar Redis como capa de caché, el fx-service evita llamadas repetidas a la API externa para cada solicitud de tipo de cambio, reduciendo la latencia y el consumo de cuota de la API. El Redis no persiste datos a disco (no tiene PVC), lo que refuerza su naturaleza de caché efímero.

### 5.3 Microservicios Python

**historial-service** (`10.88.0.235`, puerto `50054/TCP gRPC`) registra y consulta el historial de reproducción de los usuarios: qué contenidos han visto, en qué punto quedaron y cuándo lo vieron. Persiste esta información en la base de datos `historial-db` bajo el schema `playback`.

**notification-service** (`10.88.0.236`, puerto `50056/TCP gRPC`) es el servicio centralizado de comunicaciones salientes. Recibe órdenes de envío de email desde auth-service y subscription-service mediante gRPC, y las despacha a través del servidor SMTP de Gmail (`smtp.gmail.com:465`) usando SSL/TLS. Al centralizar el envío de emails en un único servicio, se simplifica la gestión de credenciales SMTP (almacenadas una sola vez en el Secret) y se facilita la implementación de reintentos y colas si en el futuro se integra un broker de mensajería.

---

## 6. Pods de Bases de Datos

### 6.1 Patrón de Despliegue de Bases de Datos

Las seis bases de datos PostgreSQL 16 (auth-db, subscription-db, catalogo-db, fx-db, historial-db, notification-db) siguen un patrón de despliegue homogéneo:

- **Estrategia `Recreate`:** a diferencia de los microservicios que usan `RollingUpdate`, las bases de datos se actualizan con `Recreate` porque el `PersistentVolumeClaim` en modo `ReadWriteOnce` solo puede ser montado por un Pod a la vez. Intentar actualizar con `RollingUpdate` mantendría el Pod antiguo activo mientras el nuevo trata de montar el mismo volumen, lo que resulta en un error de `Multi-Attach`. La estrategia `Recreate` garantiza que el Pod antiguo se termina completamente antes de que el nuevo se inicie.
- **PersistentVolumeClaims de 3Gi:** cada base de datos tiene su propio PVC en la `StorageClass` `standard-rwo` (ReadWriteOnce con acceso exclusivo), con una capacidad de 3 GiB. El volumen es montado en `/var/lib/postgresql/data` y los datos se almacenan en el subdirectorio `pgdata` (configurado mediante la variable `PGDATA`).
- **Health Probes específicas para PostgreSQL:** tanto la Readiness como la Liveness Probe ejecutan `pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"` como comando directo dentro del contenedor, sin depender de endpoints HTTP. La Readiness Probe tiene un `initialDelaySeconds` de 30 segundos (tiempo que PostgreSQL necesita para inicializar el directorio de datos en el primer arranque) y un `failureThreshold` de 6. La Liveness Probe tiene un `initialDelaySeconds` de 90 segundos para evitar que Kubernetes reinicie el Pod mientras PostgreSQL realiza una recuperación de crash-recovery al arrancar.

### 6.2 Asignación de Recursos por Pod de Base de Datos

| Base de datos    | IP interna   | Puerto | CPU Request | CPU Limit | Mem Request | Mem Limit |
|------------------|--------------|--------|-------------|-----------|-------------|-----------|
| auth-db          | 10.88.0.224  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |
| catalogo-db      | 10.88.0.225  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |
| subscription-db  | 10.88.0.231  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |
| fx-db            | 10.88.0.226  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |
| historial-db     | 10.88.0.227  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |
| notification-db  | 10.88.0.228  | 5432   | 75m         | 300m      | 256Mi       | 512Mi     |

### 6.3 Redis (Caché)

El Pod `redis` (`10.88.0.36`, puerto `6379/TCP`) ejecuta la imagen pública `redis:7-alpine` con el comando `redis-server --appendonly yes`. A diferencia de las bases de datos PostgreSQL, Redis **no tiene PVC asociado**: su naturaleza como caché efímero hace innecesaria la persistencia de datos entre reinicios. Sus recursos son significativamente menores que los de las bases de datos relacionales (Request: 25m CPU / 64Mi RAM, Limit: 150m CPU / 160Mi RAM), reflejando su rol de componente ligero de caché. La Readiness y Liveness Probe ejecutan `redis-cli ping` dentro del contenedor.

---

## 7. Asignación de Recursos por Pod de Microservicio

| Microservicio        | Lenguaje   | IP interna   | Puerto gRPC | CPU Request | CPU Limit | Mem Request | Mem Limit |
|----------------------|------------|--------------|-------------|-------------|-----------|-------------|-----------|
| frontend             | React/Nginx| 10.88.0.233  | 80 (HTTP)   | 100m        | 500m      | 128Mi       | 256Mi     |
| api-gateway          | TypeScript | 10.88.0.229  | 3000 (HTTP) | 200m        | 500m      | 256Mi       | 512Mi     |
| auth-service         | TypeScript | 10.88.0.230  | 50051       | 100m        | 300m      | 128Mi       | 256Mi     |
| catalogo-service     | Go         | 10.88.0.232  | 50052/8082  | 150m        | 400m      | 256Mi       | 512Mi     |
| subscription-service | Go         | 10.88.0.237  | 50053       | 100m        | 300m      | 128Mi       | 256Mi     |
| fx-service           | Python     | 10.88.0.234  | 50054       | 100m        | 300m      | 128Mi       | 256Mi     |
| historial-service    | Python     | 10.88.0.235  | 50054       | 100m        | 300m      | 128Mi       | 256Mi     |
| notification-service | Python     | 10.88.0.236  | 50056       | 100m        | 300m      | 128Mi       | 256Mi     |

---

## 8. Job de Migración: subscription-audit-migration

El Job `subscription-audit-migration` implementa un patrón de migración de base de datos controlada por el pipeline. Está compuesto por dos contenedores ejecutados en secuencia: un `initContainer` llamado `wait-db` que bloquea la ejecución hasta que `subscription-db` acepta conexiones (ejecutando `pg_isready` en un loop de 3 segundos), y el contenedor principal `migrate` que ejecuta el script SQL `002_audit_upgrade.sql` mediante `psql`. El Job tiene un `backoffLimit` de 5 (máximo 5 reintentos en caso de fallo) y un `ttlSecondsAfterFinished` de 600 segundos (el Job se limpia automáticamente 10 minutos después de completar). El SQL del script de migración se monta desde el ConfigMap `subscription-audit-migration-sql`, lo que permite actualizarlo sin reconstruir ninguna imagen.

---

## 9. ServiceAccount y Workload Identity

El ServiceAccount `catalogo-service-ksa` es el mecanismo que permite al Pod `catalogo-service` acceder a Google Cloud Storage sin gestionar claves JSON. La anotación `iam.gke.io/gcp-service-account: ${GCP_SA_EMAIL}` vincula el ServiceAccount de Kubernetes con una cuenta de servicio de GCP. GKE inyecta automáticamente un token de credenciales en el Pod, que rota de forma continua. El Pod usa ese token para autenticarse ante la API de GCS como si fuera la cuenta de servicio de GCP, con los permisos que esa cuenta tiene asignados en IAM. Este patrón elimina completamente la necesidad de distribuir archivos de clave JSON, que representan un riesgo de seguridad si son comprometidos.

---

## 10. Comunicación Interna entre Microservicios

Toda la comunicación interna entre el api-gateway y los microservicios de backend se realiza mediante **gRPC sobre HTTP/2**, usando los nombres de servicio Kubernetes como DNS de descubrimiento de servicios (configurados en el ConfigMap). Kubernetes DNS resuelve `auth-service:50051` a la ClusterIP `34.118.226.45`, y kube-proxy balancea las conexiones hacia los Pods correspondientes. Ningún servicio interno es accesible desde fuera del clúster por su ClusterIP; el único punto de entrada externo es el Ingress.

Las dependencias de comunicación interna son las siguientes: el **api-gateway** invoca a auth-service, catalogo-service, subscription-service, fx-service e historial-service. El **auth-service** y el **subscription-service** invocan al notification-service para disparar emails. El **subscription-service** invoca al fx-service para obtener tasas de cambio antes de procesar cobros. El **fx-service** es el único microservicio que realiza llamadas HTTP hacia un servicio externo fuera del clúster (`exchangerate-api.com`), además de leer y escribir en Redis para el caché de tasas.