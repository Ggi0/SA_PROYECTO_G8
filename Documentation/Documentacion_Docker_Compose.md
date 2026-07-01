# Documentacion Docker Compose - Quetxal TV

## Objetivo

Docker Compose se utiliza para levantar el entorno completo de Quetxal TV en maquinas virtuales o entornos locales sin depender de Kubernetes. El repositorio contiene dos archivos principales para esta operacion:

- `app/QuetxalTV/docker-compose.local.yml`: entorno local con build de imagenes desde el codigo fuente y bases de datos PostgreSQL dentro del mismo Compose.
- `app/QuetxalTV/docker-compose.cloud.yml`: entorno cloud para VM, consumiendo imagenes ya publicadas en Artifact Registry y conectandose a bases de datos externas.

Tambien existe `app/QuetxalTV/docker-compose.databases.yml`, utilizado para levantar un conjunto de bases PostgreSQL aisladas cuando se necesita separar la capa de datos.

## Servicios y Modulos del Entorno

El entorno local definido en `docker-compose.local.yml` agrupa los siguientes modulos:

| Modulo | Servicios principales | Funcion |
|---|---|---|
| Frontend | `frontend` | Interfaz web servida por Nginx en el puerto `80`. |
| API Gateway | `api-gateway` | Entrada HTTP principal del sistema, expuesta localmente en `3001`. |
| Autenticacion | `auth-service`, `auth-db` | Registro, login, JWT y perfiles de usuario. |
| Catalogo | `catalog-service`, `catalog-db` | Administracion y consulta de peliculas, series, generos y metadatos. |
| Suscripciones | `subscription-service`, `subscription-db` | Planes, pagos y reglas de suscripcion. |
| Notificaciones | `notification-service`, `notification-db` | Envio de correos y registro de eventos de notificacion. |
| Divisas | `fx-service`, `fx-db`, `redis` | Conversion de monedas y cache de tasas de cambio. |
| Historial | `historial-service`, `historial-db` | Historial de reproduccion y continuar viendo. |
| Descargas | `download-service`, `download-db` | Registro y validacion de descargas de contenido. |

Todos los servicios comparten la red Docker `quetxal-network`, lo que permite comunicacion interna por nombre de servicio, por ejemplo `auth-service:50051`, `catalog-service:50052` o `redis:6379`.

## Orden de Inicio y Dependencias

Docker Compose resuelve el orden de inicio mediante `depends_on`. En el entorno local, las bases de datos tienen `healthcheck`, por lo que los microservicios esperan a que su base este saludable antes de iniciar.

El flujo general es:

1. Se crean la red `quetxal-network` y los volumenes persistentes.
2. Inician las bases de datos PostgreSQL: `auth-db`, `notification-db`, `catalog-db`, `subscription-db`, `fx-db`, `historial-db` y `download-db`.
3. Cada base ejecuta sus scripts SQL montados en `/docker-entrypoint-initdb.d/`.
4. Compose espera los `healthcheck` de PostgreSQL con `pg_isready`.
5. Inicia `redis`, requerido por `fx-service`.
6. Inician los microservicios backend cuando sus dependencias estan disponibles.
7. Inicia `api-gateway`, que depende de servicios internos como `auth-service`, `subscription-service`, `notification-service` y `download-service`.
8. Inicia `frontend`, que depende del `api-gateway`.

En `docker-compose.cloud.yml`, las bases de datos no se levantan dentro del Compose. Los servicios consumen variables como `AUTH_DB_HOST`, `CATALOGO_DB_HOST` o `DOWNLOAD_DB_HOST`, apuntando a una VM externa de bases de datos. Esto cumple con el aislamiento de persistencia requerido para nube.

## Preparar Variables de Entorno

Antes de levantar el entorno se debe crear o actualizar el archivo `.env` dentro de:

```txt
app/QuetxalTV/.env
```

Variables minimas usadas por el entorno local:

```env
JWT_SECRET=change_me
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
EXCHANGE_API_KEY=
GCS_BUCKET_NAME=
GOOGLE_APPLICATION_CREDENTIALS=
GCS_SERVICE_ACCOUNT_EMAIL=
GCS_BUCKET=
LOCAL_VIDEO_URL=http://localhost:5173/BigBuckBunny.mp4
```

Para el entorno cloud, el pipeline de `develop` escribe automaticamente las variables necesarias en `app/QuetxalTV/.env` dentro de la VM. Las variables principales son:

```env
ARTIFACT_REGISTRY_LOCATION=us-central1
GCP_PROJECT_ID=<project-id>
ARTIFACT_REGISTRY_REPOSITORY=<repository>
IMAGE_TAG=develop
FRONTEND_PUBLIC_PORT=8080
JWT_SECRET=<secret>
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
AUTH_DB_HOST=<db-private-ip>
AUTH_DB_PORT=5432
AUTH_DB_USER=quetxal
AUTH_DB_PASSWORD=<password>
AUTH_DB_NAME=auth_db
SUBSCRIPTION_DB_HOST=<db-private-ip>
SUBSCRIPTION_DB_PORT=5433
CATALOGO_DB_HOST=<db-private-ip>
CATALOGO_DB_PORT=5434
FX_DB_HOST=<db-private-ip>
FX_DB_PORT=5435
NOTIFICATION_DB_HOST=<db-private-ip>
NOTIFICATION_DB_PORT=5436
HISTORIAL_DB_HOST=<db-private-ip>
HISTORIAL_DB_PORT=5437
DOWNLOAD_DB_HOST=<db-private-ip>
DOWNLOAD_DB_PORT=5438
GCS_BUCKET_NAME=<video-bucket>
DOWNLOAD_EXPIRY_DAYS=30
```

Las credenciales sensibles no deben escribirse directamente en el repositorio. En cloud se inyectan desde GitHub Secrets durante el pipeline de CD.

## Levantar Todo el Entorno con Docker Compose

Desde la carpeta `app/QuetxalTV`:

```bash
docker compose -f docker-compose.local.yml config
docker compose -f docker-compose.local.yml up -d
```

El primer comando valida la configuracion final despues de resolver variables de entorno. El segundo crea la red, volumenes, contenedores, bases de datos y servicios.

Para revisar el estado:

```bash
docker compose -f docker-compose.local.yml ps
```

Para revisar logs generales:

```bash
docker compose -f docker-compose.local.yml logs -f
```

Para revisar logs de un servicio especifico:

```bash
docker compose -f docker-compose.local.yml logs -f api-gateway
docker compose -f docker-compose.local.yml logs -f auth-service
docker compose -f docker-compose.local.yml logs -f catalog-service
```

## Detener el Entorno

Para detener los contenedores sin borrar volumenes:

```bash
docker compose -f docker-compose.local.yml down
```

Para detener y eliminar tambien volumenes persistentes de bases de datos:

```bash
docker compose -f docker-compose.local.yml down -v
```

El uso de `down -v` elimina los datos locales de PostgreSQL, por lo que solo debe utilizarse cuando se desea reinicializar el entorno desde los scripts SQL.

## Reconstruir Despues de Cambios

Cuando se modifica codigo fuente de frontend, API Gateway o microservicios, se deben reconstruir las imagenes locales:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Para reconstruir un servicio puntual:

```bash
docker compose -f docker-compose.local.yml build api-gateway
docker compose -f docker-compose.local.yml up -d api-gateway
```

Si se agregaron o eliminaron servicios, se recomienda limpiar contenedores huerfanos:

```bash
docker compose -f docker-compose.local.yml up -d --build --remove-orphans
```

## Entorno Cloud

El entorno cloud usa `docker-compose.cloud.yml`. A diferencia del local, no construye imagenes desde el codigo fuente. Consume imagenes publicadas en Artifact Registry:

```txt
${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPOSITORY}/<servicio>:${IMAGE_TAG}
```

Este archivo se usa en la VM de `develop` dentro del pipeline `.github/workflows/cd-develop.yml`. El flujo automatizado es:

1. GitHub Actions ejecuta CI y valida cobertura.
2. Terraform y Ansible preparan la infraestructura y la VM.
3. El pipeline construye y publica imagenes con tag `develop`.
4. El pipeline se conecta por SSH a la VM de desarrollo.
5. Actualiza el archivo `.env` con IP privada de la VM de bases de datos, secretos y datos de Artifact Registry.
6. Ejecuta la validacion de Compose:

```bash
docker compose -f docker-compose.cloud.yml config
```

7. Descarga las imagenes actualizadas:

```bash
docker compose -f docker-compose.cloud.yml pull
```

8. Levanta o actualiza el entorno cloud:

```bash
docker compose -f docker-compose.cloud.yml up -d --remove-orphans
```

9. Limpia imagenes no utilizadas:

```bash
docker system prune -f
```

En cloud, solo `frontend`, `api-gateway`, microservicios y `redis` corren dentro de este Compose. Las bases PostgreSQL se mantienen fuera de la VM de aplicacion y se acceden mediante variables `*_DB_HOST`, cumpliendo con el requisito de persistencia externa.

## Puertos Principales

| Entorno | Servicio | Puerto externo | Puerto interno |
|---|---|---:|---:|
| Local | `frontend` | `80` | `80` |
| Local | `api-gateway` | `3001` | `3000` |
| Local | `auth-service` | `50051` | `50051` |
| Local | `catalog-service` | `50052` | `50052` |
| Local | `subscription-service` | `50053` | `50053` |
| Local | `historial-service` | `50054` | `50054` |
| Local | `fx-service` | `50055` | `50055` |
| Local | `notification-service` | `50056` | `50056` |
| Local | `download-service` | `50057` | `50057` |
| Cloud VM | `frontend` | `${FRONTEND_PUBLIC_PORT:-8080}` | `80` |
| Cloud VM | `api-gateway` | `${API_GATEWAY_PUBLIC_PORT:-3000}` | `3000` |

## Resumen Operativo

| Accion | Comando |
|---|---|
| Validar local | `docker compose -f docker-compose.local.yml config` |
| Levantar local | `docker compose -f docker-compose.local.yml up -d` |
| Ver estado | `docker compose -f docker-compose.local.yml ps` |
| Ver logs | `docker compose -f docker-compose.local.yml logs -f` |
| Detener sin borrar datos | `docker compose -f docker-compose.local.yml down` |
| Detener y borrar datos | `docker compose -f docker-compose.local.yml down -v` |
| Reconstruir todo | `docker compose -f docker-compose.local.yml up -d --build` |
| Validar cloud | `docker compose -f docker-compose.cloud.yml config` |
| Descargar imagenes cloud | `docker compose -f docker-compose.cloud.yml pull` |
| Levantar cloud | `docker compose -f docker-compose.cloud.yml up -d --remove-orphans` |
