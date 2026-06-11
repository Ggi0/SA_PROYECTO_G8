# Vistas de Arquitectura 4+1 — QuetxalTV

> Documento de arquitectura del sistema QuetxalTV basado en el modelo de vistas 4+1 de Philippe Kruchten.

![Vista General 4+1](Imagenes/Vista%204%2B1%20(2).png)

---

## Vista de Escenarios

**Tipo de diagrama:** Diagrama de Casos de Uso UML

**Descripción:** Define los casos de uso principales que guían y validan el resto de las vistas arquitectónicas. Actúa como hilo conductor entre las cuatro vistas restantes.

**Actores:**
- **Usuario / Cliente** — interactúa con el sistema a través del navegador web
- **Administrador de Pago** — gestiona el procesamiento de suscripciones
- **Servicio Externo** — ExchangeRate API y SMTP Gmail

**Casos de uso:**

| ID | Nombre | Descripción |
|---|---|---|
| CU-001 | Autenticación y Gestión de Usuarios | Login con credenciales (email + password), OAuth Google, registro de nuevos usuarios, validación de JWT y renovación de token |
| CU-002 | Gestión de Perfiles | Crear, editar y eliminar perfiles dentro de una cuenta (máximo 5 por cuenta) |
| CU-003 | Gestión de Planes y Suscripciones | Consultar planes disponibles con precio en moneda local, seleccionar y adquirir un plan mediante transacción atómica |
| CU-004 | Catálogo, Búsqueda y Detalle | Navegar y filtrar contenido (películas, series), buscar por nombre o género, ver detalle de actores y estructura de temporadas/episodios |
| CU-005 | Historial y Progreso de Reproducción | Reanudar contenido desde el punto exacto por perfil (`season · episode · minute`), guardar progreso cada 30 segundos |
| CU-006 | Notificaciones y Tipo de Cambio | Envío de recibo de compra y alertas por email; conversión de precios USD → moneda local con cache de 1 hora |

**Mapeo de escenarios a vistas:**

| Escenario | Vista Lógica | Vista de Procesos | Vista de Componentes | Vista de Despliegue |
|---|:---:|:---:|:---:|:---:|
| CU-001 Autenticación | ✓ | ✓ | ✓ | ✓ |
| CU-002 Perfiles | | ✓ | ✓ | ✓ |
| CU-003 Suscripciones | | ✓ | ✓ | ✓ |
| CU-004 Catálogo | | | ✓ | ✓ |
| CU-005 Historial | | ✓ | ✓ | ✓ |
| CU-006 Notificaciones/FX | | ✓ | ✓ | ✓ |

![Vista de Escenarios](Imagenes/Diagrama%20de%20Escenarios.drawio.png)

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

![Vista Lógica](Imagenes/VistaLogica.drawio%20(2).png)

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

![Vista de Procesos](Imagenes/Vista%20de%20Procesos.drawio.png)

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

![Vista de Componentes](Imagenes/Vista%20de%20Componentes%20(Desarrollo)%20.drawio.png)

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

![Vista de Despliegue](Imagenes/Vista%20de%20Despliegue(Física).png)
