## Requerimientos del Sistema

#### Requerimientos Funcionales (RF)

| ID | Nombre | Descripción | Prioridad |
| :--- | :--- | :--- | :---: |
| **RF-001** | Registro de usuario | El sistema debe permitir que un nuevo usuario cree una cuenta proporcionando nombre, correo electrónico y contraseña. | Alta |
| **RF-002** | Inicio de sesión | Validar credenciales de usuario para otorgar acceso, implementando seguridad mediante JWT y Session Cookies cifradas. | Alta |
| **RF-003** | Cierre de sesión | El sistema debe garantizar la salida segura del usuario destruyendo la cookie activa e invalidando el token JWT correspondiente. | Alta |
| **RF-004** | Autenticación OAuth | El sistema debe habilitar el inicio de sesión rápido utilizando cuentas externas de Google bajo el estándar OAuth 2.0. | Media |
| **RF-005** | Control de intentos y bloqueo temporal | El sistema debe bloquear temporalmente el acceso a la cuenta tras registrar un número determinado de intentos fallidos continuos.| Alta |
| **RF-006** | Modificación de datos personales | El usuario debe ofrecer al usuario la opción de editar su información personal básica, como nombre y dirección de correo. | Media |
| **RF-007** | Cambio de contraseña | El usuario debe permitir el cambio de clave de acceso exigiendo la verificación de la contraseña anterior por seguridad. | Alta |
| **RF-008** | Gestión de usuarios (Administrador) | El administrador debe poder ver, activar, desactivar y eliminar cuentas de usuarios. | Alta |
| **RF-009** | Creación de perfiles | Cada cuenta puede habilitar la creación de hasta 5 perfiles personalizados por cuenta, cada uno con su propio alias e imagen. | Alta |
| **RF-010** | Cambio entre perfiles | El usuario puede permitir el intercambio dinámico entre perfiles de una misma cuenta sin requerir un nuevo inicio de sesión. | Alta |
| **RF-011** | Eliminación de perfil | El usuario puede dar la opción al usuario de borrar los perfiles secundarios que ya no requiera. | Media |
| **RF-012** | Visualización de planes de suscripción | El sistema debe desplegar la oferta de planes (Básico, Estándar y Premium) detallando beneficios y costos ajustados a la divisa local. | Alta |
| **RF-013** | Selección y compra de plan | El usuario debe permitir la selección de una membresía y tramitar la transacción financiera mediante la pasarela integrada. | Alta |
| **RF-014** | Modificación de plan | El usuario debe posibilitar la modificación del tipo de suscripción vigente desde el panel de control del usuario. | Media |
| **RF-015** | Cancelación de suscripción | El usuario debe proveer la opción de dar de baja la suscripción activa directamente desde la interfaz de gestión. | Media |
| **RF-016** | Búsqueda de contenido | El sistema debe disponer de un motor de búsqueda avanzada para localizar series y películas por su nombre, categoría o género. | Alta |
| **RF-017** | Filtrado de contenido | El sistema debe permitir segmentar el contenido multimedia según el año de estreno, género, tipo de producción y valoración. | Alta |
| **RF-018** | Vista detallada de contenido | El sistema debe mostrar la información detallada de cada título, incluyendo sinopsis, reparto, dirección, duración y etiquetas. | Alta |
| **RF-019** | Calificación de contenido | El usuario puede permitir que la comunidad califique el contenido mediante un esquema de estrellas o reacciones positivas/negativas. | Media |
| **RF-020** | Porcentaje global de recomendación | El sistema debe calcular y proyectar en tiempo real el porcentaje de aprobación de cada contenido basado en los votos del público. | Media |
| **RF-021** | Conversión de divisas (FX-Service) | El sistema debe sincronizar tipos de cambio en tiempo real para mostrar las tarifas de los planes en la moneda del país del usuario. | Alta |
| **RF-022** | Caché de tipos de cambio con Redis | El FX-Service debe almacenar temporalmente los tipos de cambio en Redis usando TTL, minimizando peticiones repetitivas a servicios externos. | Alta |
| **RF-023** | Historial de reproducción | El sistema debe almacenar el historial de reproducción de cada perfil, guardando el punto exacto de la línea de tiempo del video. | Alta |
| **RF-024** | Reanudación de contenido | Para series, el sistema debe guardar el progreso detallado de producciones seriadas para reanudar desde la temporada, episodio y segundo exacto. | Alta |
| **RF-025** | Correo de confirmación de registro | El sistema debe automatizar el envío de un correo electrónico de confirmación tras un registro exitoso en la plataforma. | Alta |
| **RF-026** | Correo de recibo de compra | El sistema debe generar y enviar por correo electrónico el recibo digital tras cada transacción o renovación de plan. | Alta |
| **RF-027** | Correo de nuevas publicaciones | El sistema debe enviar boletines informativos por correo a los usuarios registrados cuando se agregue contenido reciente al catálogo. | Media |
| **RF-028** | Gestión del catálogo (Administrador) | El administrador debe permitir al personal autorizado el alta, modificación y eliminación física o lógica de películas y series. | Alta |
| **RF-029** | Creación de contenido desde panel administrativo | El administrador debe poder agregar nuevas películas o series al catálogo, registrando título, tipo, sinopsis, clasificación, duración, año, metadatos y recursos multimedia asociados. | Alta |
| **RF-030** | Actualización de metadatos de contenido | El administrador debe poder editar la información de películas y series existentes, incluyendo póster, trailer, sinopsis, duración, género, reparto, estado de publicación y datos técnicos. | Alta |
| **RF-031** | Eliminación o desactivación de contenido | El administrador debe poder eliminar o desactivar de forma lógica títulos del catálogo para evitar que sean visibles en la cartelera de usuarios. | Alta |
| **RF-032** | Programación y calendarización de estrenos | El administrador debe poder definir la fecha y hora exacta en que un contenido pasará a estar publicado y disponible para los usuarios. | Alta |
| **RF-033** | Carga de archivos multimedia a Google Cloud Storage | El sistema debe permitir almacenar portadas, trailers, películas y capítulos en buckets de Google Cloud Storage, desacoplando los archivos pesados del sistema local. | Alta |
| **RF-034** | Reproducción de contenido desde Google Cloud Storage | El reproductor del frontend debe consumir los videos desde URLs firmadas o públicas de Google Cloud Storage y obtener la duración real del archivo multimedia. | Alta |
| **RF-035** | Auditoría transaccional por triggers | El sistema debe registrar automáticamente mediante triggers cada operación INSERT o UPDATE realizada sobre tablas relacionales críticas, almacenando usuario responsable, fecha, tabla afectada, estado anterior y estado nuevo. | Alta |
| **RF-036** | Consulta administrativa del log transaccional | El administrador debe poder visualizar desde el panel administrativo los registros de auditoría generados por los microservicios relacionales. | Alta |
| **RF-037** | Descarga de reportes estructurados | El administrador debe poder descargar reportes de auditoría en formatos CSV y PDF, ordenados y formateados para revisión operativa. | Alta |
| **RF-038** | Consulta de estado de salud del sistema | El sistema debe exponer endpoints de salud para verificar si el API Gateway y los microservicios se encuentran vivos y listos para recibir tráfico. | Alta |


#### Requerimientos No Funcionales (RNF)


| ID | Atributo de Calidad | Descripción | Métrica |
| :--- | :--- | :--- | :--- |
| **RNF-001** | Rendimiento | El sistema debe responder a las solicitudes de los usuarios en condiciones normales. | Latencia de respuesta de ≤ 300 ms en el percentil 95 ($P_{95}$) para una carga sostenida de hasta 1,000 usuarios en simultáneo. |
| **RNF-002** | Disponibilidad | La plataforma debe estar disponible de manera continua. | SLA de disponibilidad del ≥ 99.5% mensual, limitando el downtime a un máximo de 3.6 horas por mes. |
| **RNF-003** | Escalabilidad | Cada microservicio debe ser capaz de escalar de forma independiente. | Soporte operativo de hasta 10,000 conexiones concurrentes mediante escalamiento horizontal automático de servicios críticos sin pérdida de performance. |
| **RNF-004** | Seguridad - Autenticación | Las credenciales y tokens de sesión deben estar protegidos. | Expiración de tokens JWT establecida en un tope de 1 hora. Encriptación de contraseñas mediante hashing con algoritmo bcrypt utilizando un factor de costo mínimo de 12. |
| **RNF-005** | Seguridad - Comunicación | La comunicación entre cliente y servidor debe ser cifrada. | Totalidad de las peticiones externas cifradas bajo HTTPS/TLS 1.3. Tráfico interno entre servicios implementado estrictamente sobre gRPC protegido con TLS. |
| **RNF-006** | Seguridad - Datos sensibles | La información sensible no debe exponerse en el repositorio. | Ausencia absoluta de variables de entorno, URLs o contraseñas quemadas en código; uso mandatorio de archivos de configuración locales (.env) y bóvedas de secretos. |
| **RNF-007** | Tiempo de registro | El proceso de registro de un nuevo usuario no debe ser lento. | El procesamiento completo del alta de usuario y persistencia de datos debe tomar un máximo de 3 segundos tras el envío del formulario. |
| **RNF-008** | Caché - FX Service | El servicio de conversión de divisas debe minimizar llamadas a APIs externas. | Persistencia temporal de tipos de cambio en Redis con TTL de media hora, garantizando una tasa de acierto (hit rate) de la caché del ≥ 90%. |
| **RNF-009** | Mantenibilidad | El código debe adherirse a estándares de calidad. | Arquitectura basada en principios SOLID y una cobertura mínima del 70% en pruebas unitarias dentro de los componentes core del negocio. |
| **RNF-010** | Portabilidad | La plataforma debe ejecutarse de forma consistente en distintos entornos. | Entornos de ejecución basados al 100% en contenedores Docker, logrando el despliegue completo de la infraestructura en ≤ 5 minutos vía Docker Compose. |
| **RNF-011** | Tolerancia a fallos | El sistema debe manejar errores sin afectar la experiencia global del usuario. | Aislamiento estricto de fallas por microservicio mediante patrones Circuit Breaker y políticas de reintento, impidiendo el efecto dominó en el sistema. |
| **RNF-012** | Latencia de comunicación interna | La comunicación entre microservicios debe ser eficiente. | Tiempos de ejecución en transacciones gRPC internas acotados a ≤ 50 ms para el 99% de los casos ($P_{99}$). |
| **RNF-013** | Gobierno de código | El proceso de integración de código debe ser controlado. | Restricción total de push directo a las ramas `main` o `develop`; integración de código condicionada al 100% a Pull Requests con validación y aprobación de un revisor. |
| **RNF-014** | Integración continua y pruebas | El pipeline debe compilar y ejecutar pruebas automáticas del backend antes de permitir la integración del código. | Cobertura mínima del 75% sobre los endpoints backend y detención inmediata del pipeline ante fallos de pruebas, compilación o scripts. |
| **RNF-015** | CI/CD con cortocircuito crítico | El flujo de automatización debe impedir que código defectuoso avance a empaquetado o despliegue. | Cualquier error en build, pruebas o scripts debe detener el pipeline y marcar la ejecución como fallida. |
| **RNF-016** | Backup automatizado de bases de datos | El sistema debe contar con respaldo automatizado de las bases de datos operacionales utilizadas por los microservicios. | Backup completo programado desde el pipeline, excluyendo únicamente el caché temporal en Redis. |
| **RNF-017** | Construcción y versionamiento de imágenes | Los componentes del sistema deben empaquetarse como imágenes Docker versionadas y enviarse a un registro privado. | Generación automática de imágenes para frontend y backend; uso de tags semánticos únicamente al impactar la rama `release`. |
| **RNF-018** | Despliegue continuo multi-rama | El despliegue debe variar según la rama impactada. | `develop` despliega automáticamente en Google Compute Engine y `release` despliega automáticamente en Google Kubernetes Engine mediante CI/CD. |
| **RNF-019** | Orquestación Kubernetes | El entorno de release debe ejecutarse en GKE usando manifiestos declarativos. | Despliegue automatizado de Pods, Deployments, Services, ConfigMaps, Secrets e Ingress sin configuraciones manuales por CLI. |
| **RNF-020** | Punto único de acceso externo | Los servicios internos no deben exponerse de forma individual a internet. | Uso obligatorio de Ingress como única puerta de entrada externa, redirigiendo el tráfico hacia el API Gateway. |
| **RNF-021** | Aislamiento y gestión de recursos | Los componentes deben ejecutarse en un namespace controlado y con límites de recursos. | Namespace específico para la plataforma y definición de requests/limits de CPU y memoria por Pod. |
| **RNF-022** | Gestión segura de configuración en Kubernetes | Las variables de entorno y secretos deben gestionarse sin hardcoding. | Configuración no sensible por ConfigMaps y credenciales mediante Secrets cifrados; prohibido incluir contraseñas, llaves o strings de conexión en YAML. |
| **RNF-023** | Despliegue zero-downtime | Las nuevas versiones deben liberarse sin interrumpir la disponibilidad del servicio. | Uso de estrategia RollingUpdate con parámetros controlados de `maxSurge` y `maxUnavailable`. |
| **RNF-024** | Rollback automático | El sistema debe poder regresar automáticamente a la última versión estable ante fallos de despliegue. | El pipeline debe detectar estados fallidos como CrashLoopBackOff y ejecutar reversión automática del rollout. |
| **RNF-025** | Health checks obligatorios | Cada contenedor desplegado en Kubernetes debe exponer sondas diferenciadas de vitalidad y disponibilidad. | Liveness Probe para validar que el proceso está vivo y Readiness Probe para validar conexiones internas como gRPC, Redis o base de datos. |
| **RNF-026** | Almacenamiento de objetos en la nube | Los archivos multimedia pesados deben almacenarse fuera del sistema de archivos local. | Portadas, trailers, películas y episodios persistidos en Google Cloud Storage y consumidos mediante URLs firmadas o públicas. |
| **RNF-027** | Trazabilidad de cambios críticos | Las operaciones relevantes sobre datos relacionales deben quedar auditadas automáticamente. | Registro de INSERT y UPDATE con usuario responsable, timestamp, tabla afectada, estado anterior y estado nuevo en tabla de auditoría. |
