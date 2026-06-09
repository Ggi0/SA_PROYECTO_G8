# Justificación de tecnologías y desarrollo del proyecto

## 1. Descripción general del proyecto

El proyecto **Quetxal TV** consiste en una plataforma de streaming orientada a la gestión y reproducción de contenido digital, incluyendo películas, series, planes de suscripción, autenticación de usuarios, historial de reproducción, notificaciones y funcionalidades auxiliares como conversión de divisas.

La solución fue diseñada bajo una arquitectura basada en **microservicios**, separando las responsabilidades principales del sistema en servicios independientes. Esta decisión permite que cada módulo pueda desarrollarse, probarse, desplegarse y mantenerse de forma separada, reduciendo el acoplamiento entre componentes y facilitando el trabajo colaborativo del equipo.

El flujo general de la aplicación se plantea de la siguiente manera:

```txt
Frontend → API Gateway → Microservicios → Base de datos correspondiente
```

El frontend no se comunica directamente con los microservicios internos. Toda comunicación externa se centraliza mediante el **API Gateway**, que funciona como punto único de entrada al sistema.

---

## 2. Arquitectura general del sistema

La arquitectura del proyecto se divide en varias capas:

```txt
Capa de presentación:
React + Vite + TypeScript + Tailwind CSS

Capa de entrada:
API Gateway

Capa de servicios:
Auth Service
Catalog Service
Subscription Service
History Service
Notification Service
FX Service

Capa de persistencia:
PostgreSQL y esquemas/bases de datos asociados a cada microservicio
```

Cada microservicio responde a un dominio funcional específico. Esta separación permite que los servicios no dependan directamente de la implementación interna de otros módulos, sino de contratos de comunicación definidos mediante **gRPC** y **Protocol Buffers**.

---

## 3. Justificación del uso de microservicios

Se utilizó una arquitectura de microservicios porque el sistema incluye varios dominios funcionales claramente diferenciados. La autenticación, el catálogo, las suscripciones, el historial, las notificaciones y el manejo de divisas representan responsabilidades distintas que pueden evolucionar de manera independiente.

Las principales razones para utilizar microservicios fueron:

* Separar responsabilidades por dominio funcional.
* Permitir que cada integrante del equipo trabaje en un servicio específico.
* Facilitar el mantenimiento del código.
* Reducir el impacto de cambios internos en otros módulos.
* Permitir escalabilidad independiente por servicio.
* Facilitar pruebas individuales.
* Permitir que cada servicio tenga su propia base de datos o esquema de persistencia.
* Mejorar la organización del proyecto.
* Favorecer una integración controlada mediante contratos.

En lugar de construir una aplicación monolítica donde toda la lógica estuviera concentrada en un solo backend, se optó por dividir el sistema en servicios más pequeños, especializados y comunicados mediante contratos.

---

## 4. Justificación del API Gateway

El **API Gateway** se utiliza como punto único de entrada para el frontend. Esto significa que la interfaz de usuario no consume directamente los microservicios internos, sino que todas las solicitudes pasan primero por el Gateway.

El uso del API Gateway permite:

* Centralizar la comunicación del frontend.
* Ocultar la estructura interna de los microservicios.
* Unificar rutas HTTP para el frontend.
* Conectar rutas REST con métodos gRPC internos.
* Aplicar validaciones, autenticación y autorización.
* Componer respuestas usando información de varios servicios.
* Evitar que el frontend conozca puertos, direcciones o contratos internos.

Por ejemplo, para la funcionalidad de **Continuar viendo**, el Gateway puede consultar primero el `history-service` para obtener el progreso del usuario y luego consultar el `catalog-service` para obtener detalles visuales del contenido, como título, portada o descripción.

Flujo recomendado:

```txt
1. Frontend solicita "Continuar viendo".
2. API Gateway consulta History Service.
3. History Service devuelve content_id, minuto, temporada y episodio.
4. API Gateway consulta Catalog Service usando content_id.
5. API Gateway une historial + catálogo.
6. API Gateway responde al frontend con datos listos para mostrar.
```

Este enfoque mantiene el frontend desacoplado de los microservicios internos.

---

## 5. Justificación de gRPC y Protocol Buffers

La comunicación interna entre servicios se realiza mediante **gRPC** y **Protocol Buffers**. Esta tecnología permite definir contratos estrictos entre servicios, especificando métodos, parámetros de entrada y respuestas esperadas.

El uso de gRPC fue adecuado para el proyecto porque:

* Permite comunicación eficiente entre microservicios.
* Define contratos claros mediante archivos `.proto`.
* Reduce ambigüedades entre equipos.
* Permite generar código cliente y servidor.
* Facilita la integración entre servicios escritos en diferentes lenguajes.
* Mejora el rendimiento en comunicación interna frente a formatos más pesados.
* Permite versionar contratos de comunicación.

En el proyecto, los servicios exponen métodos específicos para que el API Gateway pueda consumirlos. Por ejemplo, el `history-service` expone métodos para progreso de reproducción y el `fx-service` expone métodos para conversión de divisas.

---

## 6. Justificación de PostgreSQL

Se utilizó **PostgreSQL** como sistema de base de datos relacional debido a su estabilidad, robustez y soporte para características avanzadas como:

* Relaciones entre tablas.
* Tipos UUID.
* Procedimientos almacenados.
* Funciones.
* Triggers.
* Vistas.
* Consultas complejas.
* Control transaccional.

PostgreSQL resulta adecuado para una plataforma de streaming porque muchos datos del sistema son estructurados: usuarios, perfiles, contenido, planes, suscripciones, progreso de reproducción, notificaciones y registros asociados.

Además, el uso de PostgreSQL permite colocar parte de la lógica de persistencia directamente en la base de datos mediante procedimientos y funciones, manteniendo consistencia en operaciones críticas.

---

## 7. Servicios principales del sistema

## 7.1 Frontend

El frontend fue desarrollado con:

```txt
React
Vite
TypeScript
Tailwind CSS
Axios
React Router
```

Su función principal es presentar la interfaz gráfica de la plataforma al usuario. Desde el frontend se pueden visualizar contenidos, navegar entre secciones, consultar planes, acceder al perfil, ver el historial o continuar viendo contenido.

El frontend se comunica únicamente con el **API Gateway** mediante peticiones HTTP. No consume directamente los microservicios gRPC.

---

## 7.2 API Gateway

El API Gateway funciona como capa intermedia entre el frontend y los microservicios internos.

Sus responsabilidades principales son:

* Recibir solicitudes HTTP desde el frontend.
* Validar rutas y peticiones.
* Comunicarse con los microservicios mediante gRPC.
* Unificar respuestas.
* Enriquecer información cuando sea necesario.
* Ocultar detalles internos de los servicios.
* Mantener al frontend desacoplado de la arquitectura interna.

Ejemplo de composición:

```txt
Frontend solicita continuar viendo
API Gateway consulta History Service
API Gateway consulta Catalog Service
API Gateway responde con historial enriquecido
```

El API Gateway también puede utilizar otros servicios como `fx-service` para convertir montos o consultar tipos de cambio cuando se muestren precios de planes en distintas monedas.

---

## 7.3 Auth Service

El `auth-service` se encarga de la autenticación y autorización de usuarios.

Sus responsabilidades principales son:

* Registro de usuarios.
* Inicio de sesión.
* Validación de credenciales.
* Generación y validación de tokens JWT.
* Manejo de sesiones o acceso protegido.
* Comunicación con la base de datos de usuarios.

Se utiliza JWT porque permite manejar autenticación de forma stateless, facilitando la validación del usuario desde el API Gateway y otros componentes del sistema.

---

## 7.4 Catalog Service

El `catalog-service` administra la información del contenido disponible en la plataforma.

Sus responsabilidades principales son:

* Registrar y consultar películas.
* Registrar y consultar series.
* Manejar temporadas y episodios.
* Consultar detalles de contenido.
* Proveer información visual al Gateway.
* Permitir que otros servicios obtengan información mediante `content_id`.

Un método importante del catálogo es:

```txt
GetContentDetail
```

Este método permite obtener información detallada de un contenido a partir de su identificador. Es útil para enriquecer respuestas de otros servicios, como historial o recomendaciones.

En la funcionalidad de **Continuar viendo**, el `history-service` devuelve el `content_id` y el progreso, mientras que el `catalog-service` aporta detalles visuales como título, portada, descripción o datos generales del contenido.

---

## 7.5 Subscription Service

El `subscription-service` administra los planes y suscripciones de los usuarios.

Sus responsabilidades principales son:

* Consultar planes disponibles.
* Gestionar suscripciones.
* Validar el estado de una suscripción.
* Relacionar usuarios con planes contratados.
* Apoyar reglas de acceso al contenido según el plan.
* Coordinar información de precios que puede ser convertida mediante el `fx-service`.

Este servicio permite separar la lógica de negocio relacionada con pagos, planes y acceso, evitando mezclarla con autenticación o catálogo.

---

## 7.6 History Service

El `history-service` administra el historial de reproducción de los perfiles.

Sus responsabilidades principales son:

* Guardar progreso de películas.
* Guardar progreso de series.
* Registrar temporada, episodio y minuto exacto.
* Consultar la sección **Continuar viendo**.
* Consultar el progreso de un contenido específico.
* Exponer métodos gRPC para el API Gateway.

El contrato final del servicio expone:

```txt
UpdateMovieProgress
UpdateEpisodeProgress
GetContinueWatching
GetContentProgress
```

Para películas se almacena:

```txt
profile_id
content_id
minute_reached
total_duration_min
completion_pct
```

Para series se almacena además:

```txt
season_id
episode_id
season_num
episode_num
minute_reached
```

Esto permite que el sistema muestre información como:

```txt
Temporada 2 · Episodio 4 · Minuto 18
```

El servicio utiliza procedimientos almacenados y funciones de PostgreSQL para mantener la lógica de actualización y consulta del progreso.

---

## 7.7 Notification Service

El `notification-service` se encarga de gestionar notificaciones del sistema.

Sus responsabilidades pueden incluir:

* Generar notificaciones para usuarios.
* Procesar eventos internos.
* Enviar mensajes relacionados con suscripciones, contenido o actividad del usuario.
* Integrarse con colas o mecanismos asíncronos cuando sea necesario.
* Notificar cambios relevantes, vencimientos de planes, novedades o eventos del sistema.

Este servicio se mantiene separado porque la lógica de notificaciones no debe mezclarse con autenticación, catálogo, historial o suscripciones.

---

## 7.8 FX Service

El `fx-service` administra funcionalidades relacionadas con tipos de cambio y conversión de divisas. Su objetivo es permitir que otros módulos del sistema, como suscripciones o el API Gateway, puedan consultar tasas de cambio o convertir montos en USD hacia otras monedas.

El servicio se define mediante el contrato `fx.proto` y expone los siguientes métodos gRPC:

```txt
GetExchangeRate
GetAllRates
ConvertAmount
```

### Método: GetExchangeRate

Permite obtener el tipo de cambio de una divisa específica.

Request:

```txt
ExchangeRateRequest
target_currency
requested_by
```

Response:

```txt
ExchangeRateResponse
currency_code
currency_name
symbol
rate
source
valid_at
success
error_message
```

Este método puede ser utilizado cuando se necesita mostrar el tipo de cambio actual hacia una moneda específica como GTQ, MXN o EUR.

---

### Método: GetAllRates

Permite obtener todos los tipos de cambio disponibles.

Request:

```txt
AllRatesRequest
requested_by
```

Response:

```txt
AllRatesResponse
rates
success
error_message
```

Cada elemento de `rates` utiliza la estructura:

```txt
RateItem
currency_code
currency_name
symbol
rate
```

Este método es útil cuando el frontend o el Gateway necesitan mostrar varias monedas disponibles para planes, precios o información financiera.

---

### Método: ConvertAmount

Permite convertir un monto en USD hacia otra divisa.

Request:

```txt
ConvertAmountRequest
amount
target_currency
requested_by
```

Response:

```txt
ConvertAmountResponse
original_amount
converted_amount
currency_code
symbol
rate
success
error_message
```

Este método es especialmente útil para convertir precios de planes o montos asociados a suscripciones.

Ejemplo de uso:

```txt
Subscription Service o API Gateway solicita convertir 9.99 USD a GTQ.
FX Service consulta o recupera la tasa.
FX Service responde con el monto convertido.
API Gateway envía al frontend el precio final.
```

El campo `source` permite identificar si la tasa proviene de caché o de una API externa, lo cual ayuda a controlar eficiencia, disponibilidad y trazabilidad.

---

## 8. Justificación de Python

Python fue utilizado en servicios donde se necesitaba construir lógica backend de forma rápida, clara y mantenible.

En el caso del `history-service`, Python permite:

* Levantar un servidor gRPC.
* Conectarse fácilmente a PostgreSQL.
* Ejecutar procedimientos almacenados.
* Manejar variables de entorno.
* Validar datos de entrada.
* Separar lógica en capas: handler, service y repository.

La estructura utilizada en el historial fue:

```txt
main.py          → Levanta el servidor gRPC
handler.py       → Implementa métodos gRPC
service.py       → Contiene lógica de negocio
repository.py    → Ejecuta consultas y procedimientos en PostgreSQL
config.py        → Lee variables de entorno
```

Esta organización facilita el mantenimiento y permite separar responsabilidades dentro del servicio.

---

## 9. Justificación de Go

Go fue utilizado en servicios donde se buscaba eficiencia, simplicidad y buen rendimiento en servicios backend. Go es adecuado para microservicios porque genera binarios ligeros, tiene buen manejo de concurrencia y ofrece buen desempeño en ambientes contenerizados.

En servicios como catálogo o suscripciones, Go permite construir APIs internas eficientes y fáciles de desplegar. Además, su integración con gRPC es sólida, lo que facilita la comunicación con el API Gateway y otros servicios.

---

## 10. Justificación de NestJS y TypeScript

NestJS fue utilizado como framework backend en servicios que requieren una estructura modular y ordenada, especialmente en la capa del API Gateway y servicios relacionados con autenticación.

NestJS aporta:

* Arquitectura basada en módulos.
* Separación clara entre controladores, servicios y proveedores.
* Integración con TypeScript.
* Buen soporte para validaciones.
* Estructura mantenible para proyectos grandes.
* Facilidad para implementar clientes gRPC.

El uso de TypeScript en backend permite definir tipos, interfaces y contratos, reduciendo errores en tiempo de desarrollo.

---

## 11. Justificación de React, Vite y TypeScript

El frontend fue desarrollado con React, Vite y TypeScript.

React permite construir interfaces basadas en componentes reutilizables. Esto facilita dividir la aplicación en elementos como layouts, páginas, cards, componentes de catálogo y secciones específicas como **Continuar viendo**.

Vite fue seleccionado por su rapidez en desarrollo, configuración sencilla y tiempos de compilación reducidos.

TypeScript permite agregar tipado estático al frontend, ayudando a detectar errores antes de ejecutar la aplicación.

Ventajas principales:

* Componentización.
* Reutilización de elementos visuales.
* Mejor organización del código.
* Mayor seguridad mediante tipos.
* Desarrollo rápido.
* Mejor mantenibilidad.

---

## 12. Justificación de Tailwind CSS

Tailwind CSS se utilizó para construir estilos de forma rápida mediante clases utilitarias.

Sus ventajas en el proyecto son:

* Rapidez para crear interfaces.
* Consistencia visual.
* Menor necesidad de archivos CSS separados.
* Facilidad para modificar componentes.
* Buena integración con React.
* Control directo sobre espaciados, colores, bordes y layout.

En el proyecto se utilizó para construir una interfaz con estilo cinematográfico, incluyendo tarjetas, secciones, navegación y componentes visuales de contenido.

---

## 13. Justificación de Axios

Axios se utilizó en el frontend para realizar peticiones HTTP hacia el API Gateway.

Su uso permite:

* Centralizar llamadas HTTP.
* Manejar respuestas y errores.
* Configurar una instancia base.
* Reutilizar servicios por módulo.
* Separar la lógica de consumo de API de los componentes visuales.

Por ejemplo, para historial se dejó preparado un archivo de consumo:

```txt
src/api/historial.ts
```

Este archivo contiene funciones para consumir las rutas propuestas del API Gateway.

---

## 14. Justificación de Docker

Docker se utilizó para facilitar la ejecución de servicios en contenedores.

Sus ventajas son:

* Aislar dependencias por servicio.
* Facilitar pruebas locales.
* Evitar diferencias entre ambientes.
* Simplificar despliegues.
* Permitir que cada servicio tenga su propio entorno.
* Facilitar el despliegue en una VM de GCP.

---

## 15. Justificación de variables de entorno

Las variables de entorno se utilizaron para manejar configuración sensible o dependiente del ambiente.

Ejemplo de variables utilizadas:

```txt
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_SSLMODE
DB_SCHEMA
HISTORIAL_SERVICE_PORT
```

Esto evita dejar credenciales directamente en el código fuente y permite cambiar entre ambiente local, pruebas y despliegue sin modificar la lógica del sistema.

---

## 16. Funcionalidad de Continuar viendo

Una de las funcionalidades implementadas en el `history-service` es **Continuar viendo**.

Esta funcionalidad permite que el usuario retome una película o serie desde el punto donde se detuvo.

Para películas, se registra el minuto alcanzado y el porcentaje de avance. Para series, además se registra temporada, episodio y minuto exacto.

Ejemplo visual para una serie:

```txt
Temporada 2 · Episodio 4 · Minuto 18
```

En el frontend se agregó una sección en el Home que muestra esta información al usuario. Actualmente puede utilizar datos mock mientras el API Gateway implementa las rutas finales.

---


## 17. Integración entre servicios

El sistema permite que el API Gateway integre información de varios microservicios para construir respuestas completas.

Ejemplo con historial y catálogo:

```txt
1. Frontend solicita continuar viendo.
2. API Gateway llama a History Service.
3. History Service responde con content_id y progreso.
4. API Gateway llama a Catalog Service usando GetContentDetail.
5. API Gateway combina progreso + información visual.
6. Frontend muestra tarjetas de contenido.
```

Ejemplo con suscripciones y FX:

```txt
1. Frontend solicita planes disponibles.
2. API Gateway o Subscription Service obtiene los planes.
3. API Gateway o Subscription Service consulta FX Service.
4. FX Service convierte montos de USD a otra divisa.
5. Frontend muestra precios convertidos.
```

Este modelo permite que cada servicio mantenga su responsabilidad específica, mientras el API Gateway coordina la información que se envía al usuario final.

---

## 18. Flujo de trabajo con Git

El desarrollo se realizó utilizando Git y GitHub. Cada integrante trabajó en una rama específica para su funcionalidad.

Esto permitió:

* Evitar cambios directos sobre ramas principales.
* Mantener historial de cambios.
* Trabajar de forma paralela.
* Realizar commits incrementales.
* Preparar Pull Requests para revisión.
* Reducir conflictos durante la integración.

Para el historial se trabajó sobre la rama:

```txt
feature/HistorialService
```

---

## 19. Conclusión

Las tecnologías utilizadas fueron seleccionadas con base en los requerimientos del proyecto, la necesidad de modularidad, el trabajo colaborativo y la comunicación eficiente entre servicios.

La arquitectura basada en microservicios permite separar responsabilidades y mantener servicios independientes. El API Gateway centraliza la comunicación con el frontend. gRPC y Protocol Buffers permiten contratos claros entre servicios. PostgreSQL proporciona una base robusta para manejar datos estructurados y lógica avanzada mediante procedimientos, funciones y triggers.

En el frontend, React, Vite, TypeScript y Tailwind CSS permiten construir una interfaz moderna, rápida y mantenible.

En conjunto, estas decisiones permiten construir una plataforma de streaming organizada, escalable y preparada para integración entre múltiples servicios.
