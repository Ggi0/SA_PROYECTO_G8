# Catálogo Service

Microservicio encargado de todo el catálogo multimedia de Quetxal TV.
Construido en **Go** con **gRPC** y **PostgreSQL**.

- Puerto gRPC: `50052`
- Lenguaje: Go 1.22
- Framework de comunicación: gRPC + Protocol Buffers
- Base de datos: PostgreSQL 16

---

## Responsabilidades

| Módulo | Qué hace |
|---|---|
| Películas / Series | CRUD de contenido |
| Temporadas / Episodios | Estructura de series |
| Géneros | Catálogo de géneros y asignación |
| Actores / Reparto | Personas y su rol en cada contenido |
| Búsqueda | Full-text en español (título + sinopsis) |
| Calificaciones | Thumbs up/down y estrellas, porcentaje dinámico |

---

## Estructura del proyecto

```
catalogo-service/
├── cmd/
│   └── main.go                  ← Levanta el servidor gRPC
├── internal/
│   └── catalog/
│       ├── handler.go           ← Implementa los 13 métodos gRPC
│       ├── service.go           ← Lógica de negocio
│       ├── repository.go        ← Queries a PostgreSQL
│       └── models.go            ← Structs internos
├── internal/
│   └── database/
│       └── db.go                ← Conexión a PostgreSQL
├── proto/
│   ├── catalog.proto            ← Contrato gRPC (fuente de verdad)
│   └── catalog/
│       ├── catalog.pb.go        ← Generado automáticamente
│       └── catalog_grpc.pb.go   ← Generado automáticamente
├── database/
│   ├── init.sql                 ← Schema corregido para este servicio
│   ├── seed.sql                 ← Datos de prueba
│   └── DB_CAMBIOS.md            ← Diferencias con catalogo.sql original
├── Dockerfile
├── docker-compose.local.yml
├── .env.example
├── go.mod
└── go.sum
```

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- [Go 1.22+](https://go.dev/dl/) instalado
- `grpcurl` instalado (solo para pruebas desde terminal):
  ```bash
  go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
  ```

---

## Levantar el servicio localmente

```bash
# Desde la carpeta del servicio
cd app/QuetxalTV/microservices/catalogo-service

# Levanta PostgreSQL + el servicio
docker compose -f docker-compose.local.yml up --build -d

# Ver logs
docker logs catalog-service -f

# Bajar todo (conserva los datos)
docker compose -f docker-compose.local.yml down

# Bajar todo y borrar la base de datos
docker compose -f docker-compose.local.yml down -v
```

El servicio queda disponible en `localhost:50052`.
La base de datos queda disponible en `localhost:5433`.

---

## Endpoints disponibles

| Método gRPC | Descripción |
|---|---|
| `GetCatalog` | Lista el catálogo con filtros y paginación |
| `GetContentDetail` | Ficha técnica completa de una película o serie |
| `GetSeriesStructure` | Temporadas y episodios de una serie |
| `SearchContent` | Búsqueda full-text por título y sinopsis |
| `ListGenres` | Lista todos los géneros |
| `GetPerson` | Detalle de un actor/director |
| `RateContent` | Calificar contenido (thumbs o estrellas) |
| `GetUserRating` | Ver la calificación de un perfil |
| `CreateContent` | Crear película o serie (admin) |
| `UpdateContent` | Actualizar campos de un contenido (admin) |
| `PublishContent` | Publicar contenido (lo hace visible en catálogo) |
| `CreatePerson` | Registrar actor/director/escritor |
| `AddPersonToContent` | Asociar persona a un contenido con su rol |

---

## Probar con grpcurl (Git Bash)

> **Importante:** usar **Git Bash**, no PowerShell.
> PowerShell tiene un bug con comillas dobles en ejecutables nativos.

```bash
# Agregar grpcurl al PATH (solo en la sesión actual)
export PATH=$PATH:$(go env GOPATH)/bin
```

### Ver todos los métodos disponibles
```bash
grpcurl -plaintext localhost:50052 list catalog.CatalogService
```

### Catálogo completo
```bash
grpcurl -plaintext -d '{"page":1,"page_size":10}' \
  localhost:50052 catalog.CatalogService/GetCatalog
```

### Filtrar por tipo
```bash
# Solo películas
grpcurl -plaintext -d '{"content_type":"MOVIE","page":1,"page_size":10}' \
  localhost:50052 catalog.CatalogService/GetCatalog

# Solo series
grpcurl -plaintext -d '{"content_type":"SERIES","page":1,"page_size":10}' \
  localhost:50052 catalog.CatalogService/GetCatalog
```

### Buscar contenido
```bash
grpcurl -plaintext -d '{"query":"quetzal"}' \
  localhost:50052 catalog.CatalogService/SearchContent

grpcurl -plaintext -d '{"query":"maya","content_type":"SERIES"}' \
  localhost:50052 catalog.CatalogService/SearchContent
```

### Detalle de un contenido
```bash
grpcurl -plaintext -d '{"content_id":"cccccccc-0000-0000-0000-000000000001"}' \
  localhost:50052 catalog.CatalogService/GetContentDetail
```

### Estructura de una serie (temporadas + episodios)
```bash
grpcurl -plaintext -d '{"content_id":"cccccccc-0000-0000-0000-000000000003"}' \
  localhost:50052 catalog.CatalogService/GetSeriesStructure
```

### Calificar contenido
```bash
grpcurl -plaintext -d '{
  "content_id":"cccccccc-0000-0000-0000-000000000001",
  "profile_id":"bbbbbbbb-0000-0000-0000-000000000099",
  "thumb":"UP",
  "stars":5
}' localhost:50052 catalog.CatalogService/RateContent
```

### Ver calificación de un usuario
```bash
grpcurl -plaintext -d '{
  "content_id":"cccccccc-0000-0000-0000-000000000001",
  "profile_id":"bbbbbbbb-0000-0000-0000-000000000099"
}' localhost:50052 catalog.CatalogService/GetUserRating
```

### Listar géneros
```bash
grpcurl -plaintext -d '{}' localhost:50052 catalog.CatalogService/ListGenres
```

### Crear contenido nuevo
```bash
grpcurl -plaintext -d '{
  "content_type":"MOVIE",
  "title":"La llorona",
  "synopsis":"Terror psicológico guatemalteco ambientado en la posguerra.",
  "release_year":2019,
  "duration_min":97,
  "rating_class":"NR",
  "genre_ids":[2,4]
}' localhost:50052 catalog.CatalogService/CreateContent
```

### Publicar contenido (lo activa en el catálogo)
```bash
grpcurl -plaintext -d '{"content_id":"<uuid-del-contenido>"}' \
  localhost:50052 catalog.CatalogService/PublishContent
```

---

## Probar con Postman

1. Abrir Postman → **New → gRPC**
2. Ingresar la URL: `localhost:50052`
3. Click en **"Use Server Reflection"** — descubre los 13 métodos automáticamente
4. Seleccionar el método desde el dropdown
5. Escribir el JSON en el body y click **Invoke**

No se necesita importar ningún archivo `.proto`, la reflection lo hace automáticamente.

### JSONs de ejemplo para Postman

**GetCatalog**
```json
{ "page": 1, "page_size": 10 }
```

**GetContentDetail**
```json
{ "content_id": "cccccccc-0000-0000-0000-000000000001" }
```

**SearchContent**
```json
{ "query": "maya" }
```

**GetSeriesStructure**
```json
{ "content_id": "cccccccc-0000-0000-0000-000000000003" }
```

**RateContent**
```json
{
  "content_id": "cccccccc-0000-0000-0000-000000000001",
  "profile_id": "bbbbbbbb-0000-0000-0000-000000000099",
  "thumb": "UP",
  "stars": 5
}
```

**CreateContent**
```json
{
  "content_type": "MOVIE",
  "title": "Mi película",
  "synopsis": "Descripción de la película.",
  "release_year": 2024,
  "duration_min": 90,
  "rating_class": "PG",
  "genre_ids": [1, 2]
}
```

**PublishContent**
```json
{ "content_id": "<uuid-del-contenido>" }
```

---

## IDs del seed de prueba

| Recurso | UUID |
|---|---|
| Película: El último quetzal | `cccccccc-0000-0000-0000-000000000001` |
| Película: Volcán de fuego | `cccccccc-0000-0000-0000-000000000002` |
| Serie: Crónicas de Xibalbá | `cccccccc-0000-0000-0000-000000000003` |
| Actor: Pedro Ramírez | `aaaaaaaa-0000-0000-0000-000000000001` |
| Directora: María López | `aaaaaaaa-0000-0000-0000-000000000002` |
| Actor: Carlos Fuentes | `aaaaaaaa-0000-0000-0000-000000000003` |

---

## Regenerar el código desde el .proto

Si se modifica `proto/catalog.proto`, hay que regenerar el código Go:

```bash
# Instalar las herramientas (solo la primera vez)
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Regenerar (desde la raíz del servicio)
protoc \
  --proto_path=proto \
  --go_out=proto/catalog \
  --go_opt=paths=source_relative \
  --go-grpc_out=proto/catalog \
  --go-grpc_opt=paths=source_relative \
  proto/catalog.proto
```

---

## Variables de entorno (.env)

Copiar `.env.example` a `.env` para desarrollo local:

```bash
cp .env.example .env
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de la BD | `catalog_user` |
| `DB_PASSWORD` | Contraseña | `catalog_pass` |
| `DB_NAME` | Nombre de la BD | `catalog_db` |
| `DB_SSLMODE` | Modo SSL | `disable` |
| `GRPC_PORT` | Puerto del servidor gRPC | `50052` |

---

## Pendiente

| Tarea | Descripción | Responsable |
|---|---|---|
| JWT middleware | Leer `profile_id` del metadata gRPC que inyecta el API Gateway en lugar del body | Pablo |
| Notification Service | Llamar al servicio de notificaciones vía gRPC al publicar contenido | Pablo |
| `docker-compose.cloud.yml` | Configuración para despliegue en GCP | Pablo |
| Despliegue GCP | Subir el servicio a Google Cloud Platform | Pablo |
| Corregir `catalogo.sql` | Aplicar los 4 cambios documentados en `database/DB_CAMBIOS.md` | Gio / BD team |
