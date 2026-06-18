# Justificación de Decisiones Técnicas y Arquitectónicas

## 1. Introducción

Este documento justifica las principales decisiones tomadas durante el desarrollo de Quetxal TV, explicando por qué se eligieron, para qué sirvieron y cómo aportaron al proyecto.

Quetxal TV es una plataforma de streaming orientada a la gestión y reproducción de contenido digital. El sistema incluye autenticación, perfiles, catálogo, suscripciones, pagos, historial de reproducción, notificaciones, conversión de divisas, auditoría, panel administrativo y health checks para despliegue en nube.

El flujo general del sistema se diseñó así:

```txt
Frontend → API Gateway → Microservicios → Base de datos correspondiente
```

---

## 2. Decisión: usar arquitectura basada en microservicios

### Por qué se tomó

El sistema contiene varios dominios funcionales distintos: usuarios, catálogo, suscripciones, historial, notificaciones y divisas. Si todo se colocaba en un único backend monolítico, el proyecto se volvía más difícil de mantener, probar y dividir entre integrantes.

### Para qué funcionó

Funcionó para separar responsabilidades y permitir que cada integrante trabajara en un módulo específico. Además, permitió que cada servicio evolucionara de forma independiente.

### Impacto en el proyecto

- Menor acoplamiento entre funcionalidades.
- Mejor organización del código.
- Servicios más fáciles de probar.
- Mayor claridad en la documentación.
- Posibilidad de escalar servicios de forma independiente.

---

## 3. Decisión: usar API Gateway

### Por qué se tomó

El frontend necesitaba un punto único de entrada. Si el frontend consumía directamente todos los microservicios, tendría que conocer puertos, rutas internas, contratos gRPC y lógica de composición.

### Para qué funcionó

El API Gateway centralizó las solicitudes HTTP del frontend y se encargó de comunicarse internamente con los microservicios.

### Impacto en el proyecto

- El frontend quedó desacoplado de los servicios internos.
- Se ocultó la estructura interna del backend.
- Se centralizaron rutas, autenticación y validaciones.
- Se permitió componer respuestas usando varios servicios.

Ejemplo:

```txt
Frontend solicita continuar viendo
API Gateway consulta History Service
API Gateway puede consultar Catalog Service
API Gateway responde con información completa al frontend
```

---

## 4. Decisión: usar gRPC y Protocol Buffers

### Por qué se tomó

El proyecto necesitaba comunicación eficiente y clara entre microservicios. REST podía funcionar, pero gRPC permite definir contratos estrictos y generar código cliente/servidor.

### Para qué funcionó

Funcionó para establecer métodos específicos entre el API Gateway y los servicios internos, como:

```txt
UpdateMovieProgress
UpdateEpisodeProgress
GetContinueWatching
GetContentProgress
HealthLive
HealthReady
```

### Impacto en el proyecto

- Contratos claros entre equipos.
- Menos ambigüedad en la integración.
- Mejor rendimiento en comunicación interna.
- Posibilidad de integrar servicios escritos en diferentes lenguajes.

---

## 5. Decisión: usar PostgreSQL

### Por qué se tomó

El sistema maneja datos estructurados y relacionales: usuarios, perfiles, contenido, temporadas, episodios, planes, suscripciones, pagos, historial y notificaciones.

PostgreSQL fue elegido por su robustez y soporte para funciones avanzadas.

### Para qué funcionó

Funcionó para modelar relaciones entre entidades y agregar lógica en base de datos mediante:

- Funciones.
- Procedimientos almacenados.
- Vistas.
- Triggers.
- Tipos UUID.
- JSONB para auditoría.

### Impacto en el proyecto

- Integridad de datos.
- Consultas relacionales claras.
- Auditoría transaccional.
- Lógica consistente para operaciones críticas.
- Mejor soporte para reportes.

---

## 6. Decisión: separar datos por servicio

### Por qué se tomó

En una arquitectura de servicios, cada servicio debe ser dueño de su propio dominio de datos. Si todos los servicios accedieran a las mismas tablas, se generaría acoplamiento fuerte.

### Para qué funcionó

Permitió que cada servicio administrara sus propias tablas:

| Servicio | Datos principales |
|---|---|
| Auth | Usuarios, perfiles y tokens. |
| Catalog | Contenido, géneros, temporadas, episodios y ratings. |
| Subscription | Planes, suscripciones y pagos. |
| History | Progreso de reproducción. |
| Notification | Notificaciones y estados de envío. |
| FX | Tasas de cambio. |

### Impacto en el proyecto

- Mayor independencia por servicio.
- Menor riesgo de cambios cruzados.
- Mejor alineación con SOA y microservicios.
- Diagramas ER más claros por dominio.

---

## 7. Decisión: implementar auditoría mediante triggers

### Por qué se tomó

La Fase 2 solicitaba registrar auditoría transaccional con datos como usuario responsable, tabla afectada, timestamp, estado anterior y estado nuevo. Implementar esto solo desde la aplicación podía dejar huecos si alguna operación se ejecutaba directamente en base de datos o desde otro servicio.

### Para qué funcionó

Los triggers permiten que la auditoría se registre automáticamente al ocurrir operaciones `INSERT` o `UPDATE`.

### Impacto en el proyecto

- Mayor trazabilidad.
- Registro automático de cambios.
- Menor dependencia de la capa de aplicación.
- Mejor soporte para reportes administrativos.
- Evidencia clara de cambios en tablas críticas.

Ejemplo de estructura de auditoría:

```txt
audit_id
table_name
record_id
action
responsible_user_id
responsible_profile_id
old_state
new_state
created_at
```

---

## 8. Decisión: usar Google Cloud Storage para archivos multimedia

### Por qué se tomó

El catálogo puede manejar archivos pesados como videos, trailers, portadas e imágenes. Guardar estos archivos directamente en la base de datos o en el sistema de archivos local no es adecuado para una plataforma de streaming.

### Para qué funcionó

Google Cloud Storage permite almacenar archivos pesados y guardar en base de datos únicamente las referencias o URLs.

### Impacto en el proyecto

- Menor carga sobre la base de datos.
- Mejor manejo de archivos multimedia.
- Preparación para despliegue en nube.
- Separación entre metadatos y almacenamiento de objetos.

---

## 9. Decisión: implementar panel administrativo

### Por qué se tomó

La Fase 2 requería gestión administrativa del catálogo y reportes. El sistema necesitaba una vista para que usuarios administradores pudieran crear, editar, eliminar y programar contenido.

### Para qué funcionó

El panel administrativo permitió documentar y estructurar funcionalidades como:

- Crear contenido.
- Editar metadatos.
- Eliminar contenido.
- Programar estrenos.
- Consultar auditoría.
- Descargar reportes CSV/PDF.
- Consultar estado de servicios.

### Impacto en el proyecto

- Separación entre usuario final y administrador.
- Mejor control del catálogo.
- Mayor trazabilidad de cambios.
- Documentación más completa de casos de uso.

---

## 10. Decisión: implementar health checks

### Por qué se tomó

El proyecto debía estar preparado para despliegues en Kubernetes y ambientes de nube. Para eso era necesario validar si los servicios están vivos y listos.

### Para qué funcionó

Se implementaron endpoints:

```txt
GET /health/live
GET /health/ready
```

`/health/live` valida que el proceso esté vivo.

`/health/ready` valida que el servicio esté listo y pueda comunicarse con sus dependencias, como gRPC y base de datos.

### Impacto en el proyecto

- Mejor preparación para Kubernetes.
- Detección de servicios no listos.
- Base para liveness y readiness probes.
- Mayor confiabilidad en despliegues.
- Posibilidad de retirar tráfico si un servicio no está disponible.

---

## 11. Decisión: usar Docker

### Por qué se tomó

Cada servicio utiliza dependencias distintas. Docker permite empaquetar servicios en contenedores y evitar problemas de configuración entre ambientes.

### Para qué funcionó

Funcionó para levantar servicios de forma aislada y preparar despliegues más consistentes.

### Impacto en el proyecto

- Menos errores por diferencias de ambiente.
- Servicios ejecutables de forma independiente.
- Mejor compatibilidad con CI/CD.
- Preparación para despliegue en VM o Kubernetes.

---

## 12. Decisión: usar CI/CD con GitHub Actions

### Por qué se tomó

El equipo necesitaba validar que los cambios no rompieran los servicios existentes. La integración continua permite ejecutar validaciones automáticas después de cada push o pull request.

### Para qué funcionó

El pipeline validó:

- Servicios TypeScript.
- Servicios Python.
- Servicios Go.
- Builds.
- Pruebas o cobertura mínima.
- Errores de dependencias.

### Impacto en el proyecto

- Mayor seguridad antes de hacer merge.
- Detección temprana de errores.
- Validación automática del proyecto.
- Mejor flujo de trabajo en equipo.

---

## 13. Decisión: usar Kubernetes y probes

### Por qué se tomó

El proyecto contempla despliegue en nube y uso de Kubernetes. Kubernetes necesita saber si un contenedor está vivo y si puede recibir tráfico.

### Para qué funcionó

Las sondas permiten:

- Reiniciar contenedores congelados.
- Retirar tráfico de pods no listos.
- Validar dependencias internas.
- Mejorar disponibilidad.

### Impacto en el proyecto

- Mayor resiliencia.
- Mejor operación en producción.
- Preparación para despliegue con Ingress.
- Alineación con requerimientos de Fase 2.

---

## 14. Decisión: usar React, Vite y TypeScript en frontend

### Por qué se tomó

La plataforma necesita una interfaz dinámica, reutilizable y rápida. React permite construir componentes reutilizables y Vite facilita el desarrollo con tiempos de compilación rápidos.

### Para qué funcionó

Funcionó para crear componentes como:

- Home.
- Catálogo.
- Detalle de contenido.
- Continuar viendo.
- Planes.
- Panel administrativo.
- Secciones de auditoría y health checks.

### Impacto en el proyecto

- Frontend modular.
- Mayor mantenibilidad.
- Tipado estático con TypeScript.
- Mejor experiencia de desarrollo.

---

## 15. Decisión: usar Tailwind CSS

### Por qué se tomó

Se necesitaba construir una interfaz moderna y consistente sin escribir grandes cantidades de CSS manual.

### Para qué funcionó

Tailwind permitió crear pantallas visuales rápidamente mediante clases utilitarias.

### Impacto en el proyecto

- Mayor velocidad de diseño.
- Consistencia visual.
- Componentes responsivos.
- Menor complejidad en archivos CSS.

---

## 16. Decisión: usar Python en History Service

### Por qué se tomó

Python facilita crear servicios gRPC y conectarse a PostgreSQL de forma clara. Además, permite separar fácilmente el código en handler, service y repository.

### Para qué funcionó

Funcionó para implementar:

- Registro de progreso de películas.
- Registro de progreso de series.
- Consulta de continuar viendo.
- Consulta de progreso por contenido.
- Auditoría de historial.
- Health checks de historial.

### Impacto en el proyecto

- Código claro y mantenible.
- Rápida implementación.
- Integración sencilla con PostgreSQL.
- Separación de responsabilidades internas.

---

## 17. Decisión: usar Go en servicios de alto rendimiento

### Por qué se tomó

Go es eficiente, genera binarios ligeros y funciona bien en microservicios. Es adecuado para servicios que necesitan buen rendimiento y despliegue simple.

### Para qué funcionó

Funcionó para servicios como catálogo y suscripciones, donde se manejan consultas y operaciones internas de negocio.

### Impacto en el proyecto

- Buen rendimiento.
- Menor consumo de recursos.
- Servicios fáciles de contenerizar.
- Buena compatibilidad con gRPC.

---

## 18. Decisión: usar NestJS y TypeScript en API Gateway

### Por qué se tomó

El API Gateway necesitaba una estructura modular, controladores HTTP, servicios inyectables y clientes gRPC. NestJS ofrece una arquitectura organizada para este tipo de backend.

### Para qué funcionó

Funcionó para:

- Definir controladores REST.
- Configurar clientes gRPC.
- Validar JWT.
- Crear módulos por dominio.
- Exponer endpoints de health.
- Conectar historial con el Gateway.

### Impacto en el proyecto

- Código ordenado por módulos.
- Inyección de dependencias.
- Mayor facilidad para pruebas.
- Integración clara con TypeScript.

---

## 19. Decisión: separar Notification Service

### Por qué se tomó

Las notificaciones no deben estar mezcladas con autenticación, suscripciones o catálogo. Aunque se disparan desde varios flujos, su envío y estado pertenecen a un dominio propio.

### Para qué funcionó

Funcionó para manejar:

- Correos de registro.
- Recibos de compra de suscripción.
- Alertas de nuevo contenido.
- Reintentos.
- Estados de envío.

### Impacto en el proyecto

- Menor acoplamiento.
- Mejor trazabilidad de correos.
- Posibilidad de reintentos.
- Separación clara de responsabilidades.

---

## 20. Decisión: implementar FX Service

### Por qué se tomó

Los planes pueden mostrarse en moneda local. Para no mezclar conversión de divisas con suscripciones, se creó un servicio especializado.

### Para qué funcionó

Funcionó para:

- Consultar tipo de cambio.
- Convertir montos.
- Obtener todas las tasas.
- Apoyar la visualización de precios de planes.

### Impacto en el proyecto

- Separación de lógica financiera auxiliar.
- Reutilización desde suscripciones o Gateway.
- Mejor claridad de contratos.
- Posibilidad de cachear tasas.

---

## 21. Decisión: usar variables de entorno

### Por qué se tomó

El sistema necesita configuración distinta para local, VM, nube y Kubernetes. Además, no deben quedar credenciales en el código.

### Para qué funcionó

Funcionó para manejar:

```txt
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
HISTORIAL_SERVICE_URL
JWT_ACCESS_SECRET
```

### Impacto en el proyecto

- Mayor seguridad.
- Flexibilidad entre ambientes.
- Menos cambios de código por configuración.
- Preparación para Secrets y ConfigMaps.

---

## 22. Decisión: trabajar con ramas y Pull Requests

### Por qué se tomó

El equipo necesitaba trabajar de forma paralela sin afectar `develop` directamente.

### Para qué funcionó

Funcionó para:

- Separar funcionalidades.
- Revisar cambios antes de merge.
- Ejecutar pipeline por rama.
- Integrar cambios de forma controlada.

### Impacto en el proyecto

- Menos conflictos.
- Mejor historial de cambios.
- Revisión del equipo.
- Mayor estabilidad en ramas principales.

---

## 23. Conclusión

Las decisiones tomadas en Quetxal TV estuvieron orientadas a construir una plataforma modular, mantenible, escalable y preparada para despliegue en nube.

SOA y microservicios permitieron dividir responsabilidades. El API Gateway centralizó la comunicación. gRPC permitió contratos claros. PostgreSQL aportó consistencia y capacidades avanzadas. Docker, CI/CD, Kubernetes y health checks fortalecieron el despliegue. React, Vite, TypeScript y Tailwind ayudaron a construir una interfaz moderna.

Cada decisión tuvo un propósito concreto y aportó directamente a la organización, integración, seguridad, mantenimiento y evolución del proyecto.
