# Vistas de Arquitectura 4+1 — QuetxalTV

> Documento de arquitectura del sistema QuetxalTV basado en el modelo de vistas 4+1 de Philippe Kruchten.

---

## Visión General

El modelo 4+1 organiza la arquitectura del sistema en cinco vistas complementarias: Escenarios, Lógica, Procesos, Componentes y Despliegue. La siguiente imagen muestra la relación entre todas las vistas para la Fase 3 del proyecto.

![Vista 4+1 — Fase 3](<Imagenes/Vista 4+1 Fase3.png>)

---

## Vista de Escenarios

**Tipo de diagrama:** Diagrama de Casos de Uso UML

**Descripción:** Define los casos de uso principales que guían y validan el resto de las vistas arquitectónicas. Actúa como hilo conductor entre las cuatro vistas restantes.

**Actores:**
- **Usuario / Cliente** — interactúa con el sistema a través del navegador web
- **Administrador** — gestiona catálogo, auditoría y reportes del sistema
- **Sistema de Pago** — procesa transacciones de suscripciones (`sp_process_transaction`)
- **Servicio de Correo** — SMTP Gmail, envío de recibos y alertas
- **API de Divisas Externas** — ExchangeRate API, conversión USD → moneda local
- **Kubernetes / Orquestador** — monitorea salud de servicios mediante readiness probes

**Casos de uso:**

| ID | Nombre | Descripción |
|---|---|---|
| CDU-001 | Autenticación y Gestión de Usuarios | Login con credenciales (email + password), OAuth Google, registro de nuevos usuarios, validación de JWT y renovación de token |
| CDU-002 | Gestión de Perfiles | Crear, editar y eliminar perfiles dentro de una cuenta (máximo 5 por cuenta) |
| CDU-003 | Gestión de Planes y Suscripciones | Consultar planes con precio en moneda local, adquirir plan mediante transacción atómica con integración FX y notificación de recibo |
| CDU-004 | Catálogo, Búsqueda y Detalle | Navegar y filtrar contenido (películas, series), buscar por nombre o género, ver detalle de actores y temporadas/episodios |
| CDU-005 | Gestión de Planes (administración) | Vista administrativa de planes disponibles y configuración de precios |
| CDU-006 | FX / Tipo de Cambio | Conversión de precios USD → moneda local con cache Redis TTL 3600 s; cache hit ~1 ms, cache miss consulta ExchangeRate API |
| CDU-007 | Historial y Progreso de Reproducción | Reanudar contenido desde el punto exacto por perfil (`season · episode · minute`); guardar progreso cada 30 s via `watch_progress_episode` |
| CDU-008 | Notificaciones por Correo | Envío de recibo de compra y alertas por email (SMTP Gmail); retry automático en caso de fallo |
| CDU-009 | Panel Administrador / Catálogo Dinámico | Crear y publicar contenido con recursos multimedia (portada, tráiler, video); subida hacia Google Cloud Storage; referencias URI en `catalog_db`; control de acceso por rol (403 si no es admin) |
| CDU-010 | Auditoría y Reportes Administrativos | Trigger de auditoría registra usuario, timestamp, tabla, estado anterior y nuevo; filtrado de logs; exportación de reportes CSV y PDF |
| CDU-011 | Monitor de Salud de Servicios | Readiness probes vía `GET /health/ready`; Kubernetes suspende tráfico al pod si la BD no responde (`NOT_READY`); reanuda cuando el servicio vuelve a estar saludable |

**Escenarios críticos:**

**CDU-003 — Compra de suscripción exitosa y recibo**
- Usuario autenticado selecciona plan → API Gateway
- `Subscription Service` consulta precio local → `FX Service` → Redis / ExchangeRate API
- Sistema de pago procesa transacción (`sp_process_transaction` con retries)
- `Notification Service` envía recibo por correo (SMTP Gmail)
- Resultado: suscripción activa y recibo enviado al usuario

**CDU-007 — Reanudar contenido y guardar progreso**
- Frontend solicita progreso → `Historial Service` consulta `watch_progress_episode`
- Retorna minuto exacto si existe registro; si no, inicia desde E01 S01
- Para series actualiza episodio, temporada, minuto y porcentaje cada 30 s
- Resultado: el usuario puede continuar desde el último punto guardado

**CDU-009 — Crear contenido con recursos multimedia**
- Administrador adjunta portada, tráiler y video desde el panel
- `Catalog Service` sube archivos hacia Google Cloud Storage
- Almacena referencias URI en `catalog_db`
- Resultado: contenido creado y disponible como borrador o programado

**CDU-009 — Acceso denegado al panel administrativo**
- Usuario autenticado sin rol de administrador intenta acceder al panel
- API Gateway valida JWT y permisos asociados → rechaza con `403 Forbidden`
- El intento queda registrado en logs de auditoría con detalles del usuario
- Resultado: se protege la gestión de catálogo y reportes administrativos

**CDU-010 — Auditoría transaccional y reporte administrativo**
- Cada `INSERT/UPDATE` confirma trigger de auditoría en la BD relacional
- Registra: usuario, timestamp, tabla afectada, estado anterior y nuevo
- Tabla de auditoría centralizada permite joins entre servicios
- Sistema permite filtrar logs y descargar reportes CSV o PDF
- Resultado (trazabilidad): control total de operaciones administrativas

**CDU-011 — Readiness probe con dependencia no disponible**
- Kubernetes consulta `GET /health/ready` periódicamente
- API Gateway valida conexión hacia todos los servicios gRPC
- Si la BD no responde, el servicio retorna `NOT_READY`
- Kubernetes deja de enviar tráfico al pod hasta que vuelva a estar saludable
- Resultado: el sistema aísla pods degradados sin intervención manual

**Mapeo de escenarios a vistas:**

| Escenario | Vista Lógica | Vista de Procesos | Vista de Componentes | Vista de Despliegue |
|---|:---:|:---:|:---:|:---:|
| CDU-001 Autenticación | ✓ | ✓ | ✓ | ✓ |
| CDU-002 Perfiles | | ✓ | ✓ | ✓ |
| CDU-003 Suscripciones | | ✓ | ✓ | ✓ |
| CDU-004 Catálogo | | | ✓ | ✓ |
| CDU-006 FX / Divisas | | ✓ | ✓ | ✓ |
| CDU-007 Historial | | ✓ | ✓ | ✓ |
| CDU-008 Notificaciones | | ✓ | ✓ | ✓ |
| CDU-009 Panel Admin | ✓ | ✓ | ✓ | ✓ |
| CDU-010 Auditoría | | ✓ | ✓ | ✓ |
| CDU-011 Health / K8s | | | ✓ | ✓ |

![Vista de Escenarios](<Imagenes/VistaEscenario_F3.png>)

---

## Vista Lógica

**Tipo de diagrama:** Diagrama de Secuencias UML

**Descripción:** Modela los flujos de autenticación entre los participantes del sistema, mostrando la interacción temporal entre objetos.

**Participantes:**

| Participante | Tecnología | Puerto |
|---|---|---|
| Cliente | React + Vite | — |
| API Gateway | NestJS · TypeScript | :8080 |
| Auth Service | TypeScript | :50051 |
| users_db | PostgreSQL | :5432 |
| OAuthHandler | Módulo del Gateway | — |
| Google OAuth | Servicio externo | — |

**Flujos modelados:**

1. **Login normal (credenciales válidas):** el cliente hace `POST /auth/login`, el Gateway reenvía mediante `gRPC AuthService.Login()`, el Auth Service consulta `SELECT * FROM users WHERE email = $1`, verifica contraseña con `bcrypt.compare()`, firma JWT con `jsonwebtoken.sign()` (exp: 1 h) y lo retorna como `Set-Cookie: HttpOnly · Secure · SameSite=Strict`.

2. **Credenciales inválidas (Error 401):** mismo flujo hasta `bcrypt.compare()` → `false`. El Auth Service responde `gRPC UNAUTHENTICATED` y el Gateway devuelve `401 Unauthorized`.

3. **OAuth (login con Google):** el cliente solicita `GET /auth/google`, el OAuthHandler redirige a `accounts.google.com`, intercambia el `AUTH_CODE` por `access_token + id_token`, llama a `gRPC LoginOAuth(email, googleId)`, el Auth Service hace upsert del usuario y firma un JWT propio.

4. **Token expirado:** el Gateway detecta `TokenExpiredError` al llamar `gRPC ValidateToken()`. Si hay refresh token válido en sesiones, firma nuevo JWT y renueva cookie. Si no, responde `401` y redirige a `/login`.

![Vista Lógica](<Imagenes/Vista Logica Fase3 Final.png>)

---

## Vista de Procesos

**Tipo de diagrama:** Diagrama de Actividades con swimlanes

**Descripción:** Muestra los procesos concurrentes del sistema y la interacción entre microservicios durante los flujos de negocio principales.

**Swimlanes (participantes):**
- Cliente (React + Vite)
- API Gateway (TS) — NestJS · JWT · OAuth
- Microservicios Core — Auth / Catalog / Subscription / History
- FX Service + Redis
- Notification Service

**Flujo 1 — Autenticación (Login JWT y OAuth):**
El usuario ingresa credenciales. El Gateway decide entre login normal (`gRPC auth.proto`) u OAuth (redirección a Google). Tras validar, se establece session cookie y se propaga el JWT en headers de autorización.

**Flujo 2 — Consultar planes con precio local (FX Service + Redis):**
El usuario solicita ver planes. El Gateway valida el JWT y enruta al `subscription-service`, que consulta precios en USD. Luego llama al `fx-service` vía `gRPC fx.proto`. El FX Service busca en Redis (`fx:USD:GTQ`):
- **Cache hit** → responde en ~1 ms
- **Cache miss** → consulta la API externa de divisas, guarda en Redis con TTL 3600 s y retorna el tipo de cambio

El precio se multiplica y se muestra en GTQ al usuario.

**Flujo 3 — Continuar viendo una serie (History Service):**
El usuario selecciona una serie con un perfil activo. El Gateway enruta mediante `gRPC history.proto` al `history-service` con `GetProgress(profile_id, content_id)`. Si existe progreso, el reproductor reanuda en `season · episode · minute`; si no, inicia desde E01 S01. El progreso se actualiza cada 30 s con `SaveProgress()` → `UPDATE history_db`. Al pausar o cerrar, el progreso queda persistido por perfil.

![Vista de Procesos](<Imagenes/Vista de Procesos Fase3.png>)

---

## Vista de Componentes (Desarrollo)

**Tipo de diagrama:** Diagrama de Paquetes + Diagrama de Componentes UML

**Descripción:** Muestra la organización del código en paquetes por capas (izquierda) y las interfaces provistas/requeridas entre componentes (derecha).

### Diagrama de Paquetes — Agrupación por capas

| Capa | Componente | Detalles |
|---|---|---|
| 1 — Cliente | `quetxaltv-web` | React + Vite · Axios · `«artifact» bundle.js` |
| 2 — Gateway | `api-gateway` | AuthMiddleware · GRPCClientRegistry · OAuthHandler · Puerto :8080 · archivos `.proto` embebidos |
| 3 — Microservicios | `auth-service` | TypeScript · `sp_register_user` · `trg_audit_credentials` · gRPC :50051 |
| 3 — Microservicios | `catalog-service` | Go · `vw_catalog` · `vw_actor_detail` · `fn_recommend` · gRPC :50052 |
| 3 — Microservicios | `subscription-service` | Go · `sp_process_subscription` · gRPC :50053 |
| 3 — Microservicios | `history-service` | Python · season · episode · minute · gRPC :50054 |
| 3 — Microservicios | `fx-service` | Python · Cache-Aside · TTL 3600 s · gRPC :50055 |
| 3 — Microservicios | `notification-service` | Python · registro · recibo · alerta · gRPC :50056 |
| 4 — Persistencia | Bases de datos | `auth_db` · `catalog_db` · `subscript_db` · `historial_db` · `fx_db` · `notif_db` (PostgreSQL :5432) · Redis :6379 |
| 5 — Externos | Servicios externos | ExchangeRate API (HTTPS) · SMTP Gmail (:587) |
| Contratos | `/proto` | Protocol Buffers compartidos — auth · catalog · subscription · history · fx · notification |

### Diagrama de Componentes UML — Interfaces

Cada microservicio expone una interfaz provista (○—) y el API Gateway consume interfaces requeridas (—◑):

| Interfaz | Provista por | Requerida por | Contrato |
|---|---|---|---|
| `IPublicAPI` | API Gateway | Navegador Web | HTTP/REST :8080 |
| `IAuthGRPC` | `auth-service` | API Gateway | `auth.proto · :50051` |
| `ICatalogGRPC` | `catalog-service` | API Gateway | `catalog.proto · :50052` |
| `ISubscriptionGRPC` | `subscription-service` | API Gateway | `subscription.proto · :50053` |
| `IHistoryGRPC` | `history-service` | API Gateway | `history.proto · :50054` |
| `IFXService` | `fx-service` | `subscription-service` | `fx.proto · :50055` |
| `INotification` | `notification-service` | auth · catalog · subscription | `notification.proto · :50056` |

![Vista de Componentes — Diagrama de Paquetes](<Imagenes/Diagrama_Paquetes_Fase3 (3)-Diagrama de Paquetes.drawio.png>)

![Vista de Componentes — Diagrama de Componentes UML](<Imagenes/diagrama_componentes.png>)

---

## Vista de Despliegue (Física)

**Tipo de diagrama:** Diagrama de Despliegue UML

**Descripción:** Muestra la distribución física de los artefactos en nodos de infraestructura sobre Google Cloud Platform (GCP Compute Engine VMs).

### Nodos de infraestructura

| Nodo | Artefacto desplegado | Detalles |
|---|---|---|
| Navegador Web | `quetxaltv-web` | React + Vite · Axios — corre en el cliente |
| GCP VM — API Gateway | `api-gateway` | NestJS + TypeScript · Validador JWT · Puerto :8080 · HTTPS :443 |
| GCP VM — Auth Service | `auth-service` | TypeScript · Puerto :50051 |
| GCP VM — Catalog Service | `catalog-service` | Go · Películas, Series, Actores · Puerto :50052 |
| GCP VM — Subscription Service | `subscription-service` | Go · Planes + Pagos + Historial · Puerto :50053 |
| GCP VM — History Service | `history-service` | Python · Watch progress · Puerto :50054 |
| GCP VM — FX Service | `fx-service` | Python · Tipos de cambio · Redis (Cache FX) |
| GCP VM — Notification Service | `notification-service` | Python · Email registro y compra · Puerto :50056 |
| GCP VM — `auth_db` | PostgreSQL | TCP :5432 |
| GCP VM — `catalog_db` | PostgreSQL | TCP :5432 |
| GCP VM — `subscription_db` | PostgreSQL | TCP :5432 |
| GCP VM — `historial_db` | PostgreSQL | TCP :5432 |
| GCP VM — `fx_db` | PostgreSQL | TCP :5432 |
| GCP VM — `notification_db` | PostgreSQL | TCP :5432 |
| Servicios externos | ExchangeRate API | HTTPS |
| Servicios externos | SMTP Gmail | Puerto :587 |

### Comunicación entre nodos

- **Navegador → API Gateway:** HTTPS :443
- **API Gateway → Microservicios:** gRPC sobre HTTP/2 (síncrono)
- **Microservicios → Bases de datos:** TCP :5432 (patrón *Database per Microservice*)
- **FX Service → Redis:** cache local de tipos de cambio (TTL 3600 s)
- **FX Service → ExchangeRate API:** HTTPS en caso de cache miss
- **Notification Service → SMTP Gmail:** Puerto :587

![Vista de Despliegue — Física](<Imagenes/Vista Despliegue Fisica.png>)

![Vista de Despliegue — Fase 3](<Imagenes/Vista despliege Fase3.png>)
