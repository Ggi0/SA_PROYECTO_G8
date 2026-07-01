**QuetxalTV**

download-service — Documentación técnica

## **1\. ¿Qué hace este servicio?**

download-service es el microservicio encargado de gestionar el ciclo de vida completo de las descargas de contenido para reproducción offline dentro de la plataforma QuetxalTV.

Permite a los usuarios con Plan Premium descargar películas y series para verlas sin conexión a internet. Cada descarga queda registrada en su propia base de datos aislada y expira automáticamente a los 30 días.

## **2\. Regla de negocio — ¿Quién puede descargar?**

| Plan | Descarga | Detalle |
| :---: | :---: | :---: |
| **Básico** | **⛔ BLOQUEADO** | Acceso denegado a descarga |
| **Estándar** | **⛔ BLOQUEADO** | Acceso denegado a descarga |
| **Premium** | **✅ PERMITIDO** | Puede descargar contenido |

| ⚠  IMPORTANTE: Solo el Plan Premium tiene acceso a la descarga. Los planes Básico y Estándar reciben un mensaje de error claro indicando que deben actualizar su suscripción. |
| :---- |

Esta regla está implementada en src/service.py como fuente de verdad única:

ALLOWED\_PLAN \= 3  \# PLAN\_PREMIUM

def is\_plan\_allowed(plan: int) \-\> bool:

    return plan \== ALLOWED\_PLAN

## **3\. ¿Por qué un nuevo microservicio y no agregar esto a uno existente?**

Esta fue la pregunta clave del equipo. La respuesta corta: **el proyecto lo exige y la arquitectura lo justifica.**

### **3.1 Patrón Database per Microservice (obligatorio)**

El proyecto especifica explícitamente que cada dominio debe ser un microservicio totalmente autónomo con su propia base de datos independiente. La descarga es un dominio propio con datos que ningún otro servicio debe ver ni tocar.

### **3.2 ¿Por qué no meterlo en uno de los servicios existentes?**

| Servicio | ¿Por qué no es el lugar correcto? |
| :---- | :---- |
| auth-service | Maneja identidad y sesiones. No tiene responsabilidad sobre almacenamiento de archivos. |
| catalogo-service | Gestiona metadatos del contenido. No gestiona descargas ni ciclos de expiración. |
| fx-service | Solo tipo de cambio de divisas. Sin relación con descargas. |
| historial-service | Registra progreso de reproducción online. No archivos descargados offline. |
| notification-service | Envío de correos. No gestiona descargas. |
| subscription-service | Gestiona planes y pagos. Sí valida el plan, pero no gestiona el ciclo de vida de una descarga. |

### **3.3 Interacción con subscription-service**

El download-service consulta al subscription-service vía gRPC para verificar el plan del usuario en tiempo real, en lugar de confiar únicamente en el JWT. Así cada servicio hace solo su trabajo:

API Gateway  →  download-service  (¿puede descargar?)

                     ↓ gRPC interno

             subscription-service (¿cuál es su plan actual?)

                     ↓ respuesta

             download-service     (aplica regla: solo PREMIUM)

## **4\. Estructura de archivos**

download-service/

├── proto/

│   └── download.proto          \# Contrato gRPC

├── src/

│   ├── generated/              \# Generado por protoc (no editar)

│   ├── server.py               \# Entrada principal

│   ├── service.py              \# Lógica de negocio

│   ├── repository.py           \# Queries a PostgreSQL

│   └── interceptor.py          \# Validación JWT

├── db/

│   └── init.sql                \# Tablas, trigger, SP, vista, función

├── tests/

│   ├── test\_service.py

│   └── test\_repository.py

├── .env.example

├── Dockerfile

└── requirements.txt

| Archivo | Descripción |
| :---- | :---- |
| proto/download.proto | Contrato gRPC. Define los mensajes y los 3 RPCs del servicio. |
| src/server.py | Punto de entrada. Arranca el servidor gRPC en el puerto 50057\. |
| src/service.py | Lógica de negocio. Aquí vive la regla de plan (solo Premium). |
| src/repository.py | Acceso a la BD. Únicamente queries SQL, sin lógica de negocio. |
| src/interceptor.py | Interceptor gRPC. Valida el JWT antes de cada petición. |
| db/init.sql | Inicialización de BD: tablas, índices, trigger de auditoría, SP, vista y función. |
| tests/test\_service.py | Pruebas unitarias de la lógica de negocio (sin BD real). |
| tests/test\_repository.py | Pruebas de integración del repositorio (con mock de psycopg2). |
| Dockerfile | Construye la imagen del servicio. Genera los pb2 desde el .proto automáticamente. |
| .env.example | Plantilla de variables de entorno. Copiar como .env y completar. |

## **5\. Base de datos propia — download-db**

El servicio tiene su propia instancia de PostgreSQL (download-db en el docker-compose) completamente aislada de las demás BDs del proyecto. Las referencias a user\_id, profile\_id y content\_id son lógicas, no foreign keys reales, respetando el desacoplamiento entre microservicios.

La BD incluye todos los objetos programables requeridos por el proyecto:

* Trigger: fn\_audit\_download — registra cada UPDATE en downloads\_audit automáticamente.

* Stored Procedure: sp\_purge\_expired\_downloads — elimina descargas vencidas, usado por el CronJob nocturno.

* Vista: vw\_active\_downloads — descargas activas con días restantes calculados.

* Función: fn\_is\_content\_downloaded — verifica si un contenido ya fue descargado por un perfil.

## **6\. Cómo correrlo localmente**

### **Solo el servicio de descarga (para desarrollo):**

docker-compose \-f docker-compose.local.yml up \--build download-db download-service

### **Todo el stack completo:**

docker-compose \-f docker-compose.local.yml up \--build

### **Variables de entorno requeridas (.env):**

* JWT\_SECRET — debe coincidir con el api-gateway

* DB\_HOST, DB\_USER, DB\_PASSWORD, DB\_NAME — credenciales de download-db

* GCS\_BUCKET — nombre del bucket en Google Cloud Storage

* DOWNLOAD\_EXPIRY\_DAYS — días de validez de la descarga (default: 30\)

## **7\. Integración con el API Gateway (NestJS)**

El módulo download dentro del api-gateway expone los siguientes endpoints REST:

| Método | Ruta | Descripción |
| :---- | :---- | :---- |
| **POST** | /downloads/initiate | Inicia una nueva descarga. Solo Plan Premium. |
| **GET** | /downloads | Lista las descargas activas del perfil. |
| **DELETE** | /downloads/:downloadId | Elimina una descarga del almacenamiento local. |

| El JWT guard del api-gateway ya valida el token antes de llegar al controlador. El plan se extrae de los claims del JWT y se envía como parámetro numérico al download-service vía gRPC. |
| :---- |

## **8\. Comunicación interna gRPC**

El servicio expone 3 RPCs definidos en download.proto. Todos requieren JWT válido gracias al interceptor:

* InitiateDownload — inicia una descarga y retorna la URL firmada de GCS.

* ListDownloads — lista las descargas activas y no expiradas del perfil.

* DeleteDownload — eliminación lógica (status \= DELETED) de una descarga.

QuetxalTV — Software Avanzado, Vacaciones de Junio 2026  ·  ECYS, Universidad San Carlos de Guatemala