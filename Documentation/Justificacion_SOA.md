# Justificación de Arquitectura SOA en Quetxal TV

## 1. Introducción

El proyecto Quetxal TV fue diseñado como una plataforma de streaming basada en una arquitectura orientada a servicios. El objetivo principal fue separar las funcionalidades del sistema en servicios independientes, reutilizables y comunicados mediante contratos.

El sistema incluye funcionalidades como autenticación, gestión de perfiles, catálogo de películas y series, suscripciones, pagos, historial de reproducción, notificaciones, conversión de divisas, auditoría y health checks. Debido a esta variedad de responsabilidades, una arquitectura monolítica habría aumentado el acoplamiento y la complejidad del mantenimiento.

Por esa razón se decidió aplicar una arquitectura SOA y llevarla a una implementación basada en microservicios.

---

## 2. Qué entendemos por SOA en el proyecto

SOA significa **Service-Oriented Architecture** o arquitectura orientada a servicios. En este enfoque, el sistema se divide en servicios que representan capacidades de negocio independientes.

En Quetxal TV, cada servicio cumple una responsabilidad clara:

```txt
Frontend → API Gateway → Microservicios → Base de datos correspondiente
```

La comunicación directa entre el frontend y los microservicios internos no se permite. El frontend consume rutas HTTP expuestas por el API Gateway, y el Gateway se encarga de comunicarse internamente con los servicios mediante gRPC.

---

## 3. Servicios definidos en Quetxal TV

| Servicio | Responsabilidad |
|---|---|
| Auth Service | Registro, inicio de sesión, usuarios, perfiles y tokens. |
| Catalog Service | Películas, series, temporadas, episodios, géneros, reparto y calificaciones. |
| Subscription Service | Planes, suscripciones, pagos y cambios de plan. |
| History Service | Progreso de reproducción, continuar viendo e historial por perfil. |
| Notification Service | Correos de registro, recibos de compra y alertas. |
| FX Service | Tasas de cambio, conversión de divisas y cacheo de tasas. |
| API Gateway | Punto único de entrada y orquestación de solicitudes del frontend. |

Esta separación permite que cada dominio funcional evolucione sin afectar directamente a los demás.

---

## 4. Justificación de usar SOA

La arquitectura SOA fue adecuada para el proyecto por las siguientes razones:

### 4.1 Separación de responsabilidades

Cada servicio encapsula una capacidad específica del negocio. Por ejemplo, el historial no administra usuarios, y las suscripciones no gestionan el catálogo. Esto reduce el acoplamiento y mejora la organización del código.

### 4.2 Trabajo colaborativo

El proyecto fue desarrollado por varios integrantes. SOA permitió dividir el trabajo por servicios, de forma que cada integrante pudiera avanzar en un módulo específico sin bloquear a los demás.

### 4.3 Escalabilidad

Al tener servicios separados, es posible escalar de forma independiente aquellos que reciben más carga. Por ejemplo, el `catalog-service` podría requerir más instancias que el `fx-service`, dependiendo del uso del sistema.

### 4.4 Mantenimiento

Cuando se necesita cambiar una funcionalidad, el impacto se limita al servicio correspondiente. Si se modifica el cálculo del progreso de reproducción, el cambio ocurre en el `history-service` y no en todo el backend.

### 4.5 Reutilización

Los servicios pueden ser consumidos por diferentes componentes. Por ejemplo, el `catalog-service` puede ser usado por el Home, la búsqueda, el detalle de contenido, el historial y el panel de administración.

### 4.6 Contratos claros

La comunicación entre servicios está definida mediante contratos gRPC y Protocol Buffers. Esto permite que cada servicio conozca exactamente qué métodos puede consumir y qué datos recibirá.

---

## 5. API Gateway como punto de entrada

El **API Gateway** es una pieza central de la arquitectura. Su responsabilidad es recibir solicitudes HTTP del frontend y traducirlas a llamadas internas hacia los microservicios.

### Razones para usar API Gateway

- Centraliza las rutas del frontend.
- Oculta la estructura interna de microservicios.
- Evita exponer puertos internos.
- Permite validar autenticación y autorización.
- Permite componer respuestas de varios servicios.
- Reduce el acoplamiento del frontend.
- Facilita futuras reglas de seguridad y monitoreo.

Ejemplo:

```txt
Frontend solicita "Continuar viendo"
        ↓
API Gateway recibe la solicitud HTTP
        ↓
API Gateway consulta History Service por gRPC
        ↓
API Gateway puede consultar Catalog Service para enriquecer datos
        ↓
Frontend recibe una respuesta lista para mostrar
```

---

## 6. Comunicación interna mediante gRPC

Se utilizó **gRPC** para la comunicación entre el API Gateway y los microservicios. Esta decisión se tomó porque gRPC permite definir contratos estrictos y eficientes mediante archivos `.proto`.

### Ventajas de gRPC en el proyecto

- Comunicación rápida entre servicios.
- Contratos fuertemente definidos.
- Generación de código cliente y servidor.
- Integración entre diferentes lenguajes.
- Menor ambigüedad en la integración.
- Adecuado para comunicación interna.

Ejemplo de contrato del historial:

```proto
service HistorialService {
  rpc UpdateMovieProgress (UpdateMovieProgressRequest) returns (ProgressResponse);
  rpc UpdateEpisodeProgress (UpdateEpisodeProgressRequest) returns (ProgressResponse);
  rpc GetContinueWatching (GetContinueWatchingRequest) returns (ContinueWatchingResponse);
  rpc GetContentProgress (GetContentProgressRequest) returns (ProgressResponse);
  rpc HealthLive (HealthCheckRequest) returns (HealthCheckResponse);
  rpc HealthReady (HealthCheckRequest) returns (HealthCheckResponse);
}
```

---

## 7. Persistencia separada por servicio

Cada servicio maneja sus propias tablas, esquemas o base de datos. Esta decisión se alinea con SOA porque cada servicio controla su propio modelo de datos.

Ejemplos:

| Servicio | Tablas principales |
|---|---|
| Auth Service | `users`, `profiles`, `refresh_tokens`, `auth_audit_log` |
| Catalog Service | `content`, `seasons`, `episodes`, `genres`, `ratings`, `catalog_audit_log` |
| Subscription Service | `plans`, `subscriptions`, `payments`, `subscription_audit_log` |
| History Service | `watch_progress`, `watch_progress_episode`, `history_audit_log` |
| Notification Service | `notifications`, `notification_types`, `notification_audit_log` |
| FX Service | `exchange_rates`, `fx_audit_log` |

Esto evita que un servicio dependa directamente de las tablas internas de otro servicio. La integración se realiza mediante contratos y no mediante acceso directo a bases ajenas.

---

## 8. Escenarios donde SOA aportó valor

### 8.1 Continuar viendo

El `history-service` almacena el progreso de reproducción por perfil. Para mostrar una tarjeta completa en el frontend, el sistema puede usar también el `catalog-service`, que aporta título, portada y metadatos del contenido.

```txt
History Service → progreso
Catalog Service → información visual
API Gateway → une ambos datos
Frontend → muestra "Continuar viendo"
```

Esto demuestra composición de servicios sin mezclar responsabilidades.

### 8.2 Compra de suscripción

La compra de una suscripción involucra varios servicios:

```txt
Usuario selecciona plan
Subscription Service registra suscripción y pago
FX Service puede convertir precio a moneda local
Notification Service envía recibo de compra
```

Cada servicio ejecuta su parte del flujo, sin concentrar toda la lógica en un único componente.

### 8.3 Auditoría

La auditoría se implementa por servicio y por base de datos. Cada dominio registra sus propios cambios mediante triggers en tablas de auditoría. Esto mantiene la trazabilidad sin centralizar toda la persistencia en una única base.

### 8.4 Health checks

Los endpoints de salud permiten verificar si el API Gateway y los servicios internos están listos para recibir tráfico.

```txt
/health/live  → verifica que el proceso esté vivo
/health/ready → verifica dependencias internas como gRPC y base de datos
```

Esto es útil para ambientes con Kubernetes y despliegue en nube.

---

## 9. Relación entre SOA y microservicios

El proyecto aplica los principios de SOA y los implementa mediante microservicios. SOA define la idea de dividir capacidades en servicios reutilizables, mientras que los microservicios representan una forma concreta de implementarlo con despliegues independientes, bases separadas y comunicación por red.

En Quetxal TV, esto se refleja en:

- Servicios independientes.
- Contratos gRPC.
- API Gateway.
- Bases separadas por dominio.
- Dockerización.
- Despliegue en VM o Kubernetes.
- Health checks por servicio.
- CI/CD por componentes.

---

## 10. Beneficios obtenidos

| Beneficio | Cómo se refleja en el proyecto |
|---|---|
| Modularidad | Cada servicio tiene una responsabilidad específica. |
| Bajo acoplamiento | La comunicación se realiza mediante contratos. |
| Escalabilidad | Los servicios pueden escalar de forma independiente. |
| Mantenibilidad | Los cambios se aíslan por dominio. |
| Trabajo en equipo | Cada integrante puede trabajar en un servicio. |
| Reutilización | Servicios como catálogo, FX o notificaciones pueden ser usados por varios flujos. |
| Seguridad | El frontend solo conoce el API Gateway. |
| Observabilidad | Health checks y auditoría permiten monitorear el estado y los cambios. |

---

## 11. Limitaciones y consideraciones

SOA también introduce desafíos que fueron considerados durante el proyecto:

- Mayor complejidad de integración.
- Necesidad de definir contratos claros.
- Mayor cantidad de servicios que desplegar.
- Manejo de variables de entorno por servicio.
- Coordinación entre equipos.
- Posibles fallos de comunicación entre servicios.
- Necesidad de health checks para validar disponibilidad.

Estas consideraciones se mitigaron usando API Gateway, gRPC, Docker, documentación de contratos y pruebas de build/pipeline.

---

## 12. Conclusión

La arquitectura SOA fue una decisión adecuada para Quetxal TV porque el sistema posee varios dominios funcionales claramente diferenciados. Al separar autenticación, catálogo, suscripciones, historial, notificaciones y divisas en servicios independientes, se obtuvo una solución más ordenada, mantenible y escalable.

El API Gateway permitió centralizar el acceso desde el frontend, mientras que gRPC y Protocol Buffers facilitaron la comunicación interna con contratos claros. PostgreSQL permitió manejar persistencia estructurada por servicio, incluyendo funciones, procedimientos, vistas y triggers de auditoría.

En conjunto, SOA permitió que Quetxal TV creciera de forma controlada y que las nuevas funcionalidades de Fase 2, como auditoría, panel administrativo y health checks, pudieran integrarse sin romper la estructura existente.
