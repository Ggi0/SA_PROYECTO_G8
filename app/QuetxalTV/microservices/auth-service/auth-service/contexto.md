# pryecto

# CONTEXTO COMPLETO DEL PROYECTO

## Descripción General

El proyecto consiste en una plataforma web de streaming de video bajo demanda inspirada en servicios como Netflix, Disney+ o Prime Video.

El objetivo principal no es construir una plataforma real de distribución masiva de video, sino diseñar e implementar una arquitectura moderna basada en microservicios, utilizando múltiples lenguajes de programación, comunicación gRPC, bases de datos independientes y despliegue mediante contenedores.

La arquitectura debe cumplir los requisitos académicos del curso y demostrar:

* Arquitectura de Microservicios
* Backend Políglota
* Comunicación gRPC
* API Gateway
* JWT + Session Cookies + OAuth
* Redis Cache
* PostgreSQL
* Docker
* Docker Compose
* Google Cloud Platform
* Procedimientos almacenados
* Funciones
* Vistas
* Triggers
* Flujo profesional mediante Pull Requests

---

# Objetivos Arquitectónicos

La solución fue diseñada siguiendo los siguientes principios:

1. Cada dominio de negocio posee su propio microservicio.
2. Cada microservicio posee su propia base de datos independiente.
3. Ningún servicio puede acceder directamente a la base de datos de otro servicio.
4. Toda comunicación entre servicios se realiza mediante gRPC.
5. Todo acceso externo se realiza únicamente mediante el API Gateway.
6. El frontend nunca se comunica directamente con los microservicios.
7. Las relaciones entre dominios se realizan mediante IDs compartidos y llamadas gRPC, nunca mediante Foreign Keys entre bases de datos.

---

# Tecnologías Seleccionadas

## Frontend

* React
* TypeScript
* Vite
* Axios

## API Gateway

* NestJS
* TypeScript
* REST HTTP
* JWT Validation
* gRPC Clients

## Microservicios TypeScript

* NestJS
* gRPC

## Microservicios Go

* Go
* gRPC

## Microservicios Python

* Python
* FastAPI
* gRPC

## Persistencia

* PostgreSQL

## Cache

* Redis

## Infraestructura

* Docker
* Docker Compose
* Google Cloud Platform

---

# Arquitectura General

Frontend
↓
API Gateway
↓
├── Auth Service
├── Catalog Service
├── Subscription Service
├── Playback Service
├── FX Service
└── Notification Service

Todos los servicios poseen:

* Base de datos propia
* Dockerfile propio
* Variables de entorno propias
* Contrato gRPC propio

---

# Distribución de Lenguajes

## TypeScript

Utilizado para:

* API Gateway
* Auth Service

Motivo:

Excelente integración con autenticación, JWT, OAuth y NestJS.

---

## Go

Utilizado para:

* Catalog Service
* Subscription Service

Motivo:

Excelente rendimiento para consultas, búsquedas y lógica transaccional.

---

## Python

Utilizado para:

* Playback Service
* FX Service
* Notification Service

Motivo:

Facilidad de integración con APIs externas, Redis y servicios SMTP.

---

# Microservicio 1 - Auth Service

## Responsabilidad

Gestionar identidad, acceso y perfiles.

## Funcionalidades

* Registro
* Login
* Logout
* JWT
* OAuth
* Session Cookies
* Cambio de contraseña
* Recuperación de contraseña
* Gestión de perfiles

## Reglas

* Máximo 5 perfiles por cuenta.
* Cada perfil mantiene preferencias independientes.
* Cada perfil mantiene historial independiente.


## Comunicación

Puede llamar a:

Notification Service

Para:

* Correo de bienvenida
* Recuperación de contraseña

---

# Microservicio 2 - Catalog Service

## Responsabilidad

Gestionar todo el contenido multimedia.

## Funcionalidades

* Películas
* Series
* Episodios
* Géneros
* Actores
* Búsqueda
* Filtrado
* Calificaciones
* Porcentaje de recomendación

## Base de Datos

catalog_db

## Tablas Principales

* content
* movies
* series
* episodes
* genres
* actors
* content_actor
* ratings

## Objetos SQL

Funciones:

* Cálculo de porcentaje de recomendación

Vistas:

* Cartelera
* Detalle de contenido
* Actores por contenido

Triggers:

* Auditoría de modificaciones

## Comunicación

Puede llamar a:

Notification Service

Para:

* Alertas de nuevo contenido

---

# Microservicio 3 - Subscription Service

## Responsabilidad

Gestionar monetización y suscripciones.

## Funcionalidades

* Planes
* Suscripciones
* Pagos
* Historial de compras
* Cancelaciones

## Planes

* Básico
* Estándar
* Premium

## Base de Datos

subscription_db

## Tablas Principales

* plans
* subscriptions
* payments
* payment_history

## Objetos SQL

Procedimientos:

* Compra de suscripción

Funciones:

* Validación de suscripción activa

Triggers:

* Auditoría financiera

## Comunicación

Puede llamar a:

FX Service
Notification Service

Para:

* Obtener tipos de cambio
* Enviar recibos de compra

---

# Microservicio 4 - Playback Service

## Responsabilidad

Gestionar el progreso de reproducción.

## Funcionalidades

* Continue Watching
* Historial de reproducción
* Reanudación de contenido
* Progreso de películas
* Progreso de series

## Base de Datos

playback_db

## Tablas Principales

* watch_history
* episode_progress

## Información almacenada

* profile_id
* content_id
* season_number
* episode_number
* current_minute

## Comunicación

Normalmente no requiere llamar a otros servicios.

---

# Microservicio 5 - FX Service

## Responsabilidad

Gestionar tipos de cambio.

## Funcionalidades

* Conversión monetaria
* Cache de divisas
* Consulta de API externa

## Monedas

* USD
* GTQ
* EUR
* MXN

## Base de Datos

fx_db

## Redis

Redis almacena temporalmente:

* Tipos de cambio
* TTL configurable

## Flujo

Subscription Service
↓
FX Service
↓
Redis
↓
API Externa de Divisas

## Comunicación

Recibe llamadas de:

* Subscription Service

---

# Microservicio 6 - Notification Service

## Responsabilidad

Gestionar correos electrónicos.

## Funcionalidades

* Confirmación de registro
* Recuperación de contraseña
* Recibo de compra
* Alerta de nuevo contenido

## Base de Datos

notification_db

## Tablas Principales

* email_templates
* notification_logs
* email_queue

## Comunicación

Recibe llamadas desde:

* Auth Service
* Catalog Service
* Subscription Service

---

# Comunicación entre Servicios

Toda comunicación interna utiliza:

gRPC

Toda definición de contratos se encuentra en:

/proto

Ejemplo:

auth.proto
catalog.proto
subscription.proto
playback.proto
fx.proto
notification.proto

Los contratos son compartidos por todos los servicios.

---

# Regla Fundamental de Datos

NO existen Foreign Keys entre bases de datos.

Incorrecto:

playback_db.watch_history
→ FK hacia auth_db.profiles

Correcto:

playback_db.watch_history

guarda:

* profile_id
* content_id

como UUID simples.

Cuando un servicio necesita información externa:

Realiza una llamada gRPC al servicio propietario.

Ejemplo:

Playback Service
↓
Catalog Service
↓
Obtener información del contenido

---

# Flujo de Login

Frontend
↓
API Gateway
↓
Auth Service
↓
auth_db

Respuesta:

JWT
Session Cookie

---

# Flujo de Compra de Suscripción

Frontend
↓
API Gateway
↓
Subscription Service
↓
FX Service
↓
Redis
↓
API Externa

Subscription Service
↓
subscription_db

Subscription Service
↓
Notification Service

Notification Service
↓
Correo de recibo

---

# Flujo de Reproducción

Frontend
↓
API Gateway
↓
Catalog Service

Catalog Service
↓
Devuelve metadata

Frontend
↓
Reproduce video

Playback Service
↓
Guarda progreso

---

# Estrategia de Video

No se implementará una infraestructura compleja de streaming.

Opciones aceptadas:

1. URLs públicas de videos
2. Videos almacenados en Google Cloud Storage
3. Videos embebidos desde YouTube (opción recomendada para simplificar)

Catalog Service almacena únicamente:

* video_url

El frontend reproduce mediante:

HTML5 Video Player

o

YouTube Embed

---

# Organización del Repositorio

streaming-platform/

* frontend/
* api-gateway/
* auth-service/
* catalog-service/
* subscription-service/
* playback-service/
* fx-service/
* notification-service/
* proto/
* docker-compose.local.yml
* docker-compose.cloud.yml

Cada servicio contiene:

* Código fuente
* Dockerfile
* .env
* Migraciones
* Scripts SQL
* Implementación gRPC

---

# Filosofía General

Cada microservicio es dueño absoluto de su dominio.

Auth → usuarios
Catalog → contenido
Subscription → pagos
Playback → historial
FX → divisas
Notification → correos

Ningún servicio accede a la base de datos de otro servicio.

Toda colaboración entre dominios ocurre mediante gRPC.

El API Gateway es el único punto de entrada para clientes externos.

La arquitectura busca demostrar desacoplamiento, escalabilidad, mantenibilidad y aplicación correcta del patrón Database per Service.


# Contratos gRPC y Comunicación Interna

## ¿Qué es un contrato?

Un contrato es un acuerdo formal que define exactamente cómo dos sistemas se comunicarán.

En esta arquitectura, los contratos son archivos `.proto` (Protocol Buffers) que describen:

* Qué operaciones puede ejecutar un servicio.
* Qué datos recibe.
* Qué datos devuelve.
* Qué tipos de datos utiliza.

Ejemplo:

```proto
syntax = "proto3";

service AuthService {

  rpc Register(RegisterRequest)
      returns (RegisterResponse);

  rpc Login(LoginRequest)
      returns (LoginResponse);

}

message LoginRequest {
  string email = 1;
  string password = 2;
}

message LoginResponse {
  string access_token = 1;
  string refresh_token = 2;
}
```

Este archivo se convierte en el contrato oficial entre el API Gateway y el Auth Service.

---

## ¿Por qué existen los contratos?

La arquitectura utiliza múltiples lenguajes:

* TypeScript
* Go
* Python

Cada lenguaje implementa los servicios de forma diferente.

Los contratos garantizan que todos hablen exactamente el mismo idioma.

Sin importar si un servicio está escrito en Go y otro en Python, ambos entienden el mismo contrato.

---

## Ubicación de los contratos

Todos los contratos se almacenan en:

```text
streaming-platform/
│
└── proto/
    ├── auth/
    │   └── auth.proto
    ├── catalog/
    │   └── catalog.proto
    ├── subscription/
    │   └── subscription.proto
    ├── playback/
    │   └── playback.proto
    ├── fx/
    │   └── fx.proto
    └── notification/
        └── notification.proto
```

Esta carpeta es compartida por todos los servicios.

---

## Flujo de generación de código

Cuando se crea o modifica un contrato:

```text
auth.proto
```

se ejecuta el compilador Protocol Buffers.

El compilador genera automáticamente:

```text
TypeScript
Go
Python
```

para cada servicio que lo necesite.

Por lo tanto:

```text
El contrato es la fuente de verdad.
```

No se escriben manualmente los modelos de comunicación.

Se generan automáticamente desde los `.proto`.

---

# Modelo de Comunicación

La plataforma utiliza dos tipos distintos de comunicación.

## Comunicación Externa

Frontend ↔ API Gateway

Utiliza:

```text
HTTP
REST
JSON
```

Ejemplo:

```http
POST /auth/login
```

```json
{
  "email": "user@email.com",
  "password": "123456"
}
```

El frontend únicamente conoce:

```text
API Gateway
```

Nunca conoce los microservicios.

---

## Comunicación Interna

API Gateway ↔ Microservicios

Utiliza:

```text
gRPC
Protocol Buffers
```

Ejemplo:

```text
AuthService.Login()
```

No existen endpoints REST.

No existen URLs.

No existe JSON.

Todo ocurre mediante llamadas RPC.

---

# Diferencia entre REST y gRPC

## REST

Utiliza rutas.

Ejemplo:

```http
POST /auth/login

GET /catalog/movies

POST /subscription/purchase
```

Todo se identifica mediante URLs.

---

## gRPC

Utiliza métodos.

Ejemplo:

```text
AuthService.Login()

AuthService.Register()

CatalogService.SearchContent()

CatalogService.RateContent()

SubscriptionService.CreateSubscription()
```

Todo se identifica mediante funciones remotas.

---

# Flujo Real de Login

## Paso 1

Frontend:

```http
POST /auth/login
```

envía:

```json
{
  "email": "admin@test.com",
  "password": "123456"
}
```

---

## Paso 2

API Gateway recibe la petición.

---

## Paso 3

API Gateway NO ejecuta lógica.

Simplemente traduce:

```http
POST /auth/login
```

a:

```text
AuthService.Login()
```

mediante gRPC.

---

## Paso 4

Auth Service recibe:

```text
LoginRequest
```

---

## Paso 5

Auth Service consulta:

```text
auth_db
```

---

## Paso 6

Auth Service responde:

```text
LoginResponse
```

---

## Paso 7

API Gateway transforma nuevamente la respuesta en JSON.

---

## Paso 8

Frontend recibe:

```json
{
  "access_token": "...",
  "refresh_token": "..."
}
```

---

# Comunicación entre Microservicios

Los microservicios también pueden comunicarse entre ellos usando gRPC.

Ejemplo:

```text
Subscription Service
        │
        ▼
FX Service
```

---

Caso práctico:

Usuario compra una suscripción.

Subscription Service necesita conocer:

```text
USD → GTQ
```

Entonces realiza:

```text
FXService.GetExchangeRate()
```

---

FX Service responde:

```text
exchange_rate = 7.78
```

---

Subscription Service calcula el monto final y continúa la compra.

---

# Principio Fundamental

Los microservicios NO se comunican mediante:

```text
HTTP REST
Endpoints públicos
Consultas SQL
Acceso directo a bases de datos
```

Los microservicios se comunican únicamente mediante:

```text
gRPC
+
Contratos Protocol Buffers (.proto)
```

---

# Resumen de Comunicaciones del Sistema

```text
Frontend
    │
    │ HTTP + JSON
    ▼
API Gateway
    │
    │ gRPC
    ▼
─────────────────────────────────

Auth Service
Catalog Service
Subscription Service
Playback Service
FX Service
Notification Service

─────────────────────────────────
    │
    │ SQL
    ▼

PostgreSQL
```

La idea clave es esta:

```text
Frontend  → HTTP/REST → API Gateway

API Gateway → gRPC → Microservicios

Microservicios → SQL → Su propia base de datos
```

Y entre microservicios:

```text
Microservicio A
        │
        │ gRPC
        ▼
Microservicio B
```

Nunca:

```text
Microservicio A
        │
        ▼
Base de datos de Microservicio B
```

porque eso rompería completamente el patrón **Database per Service** que exige la arquitectura.

