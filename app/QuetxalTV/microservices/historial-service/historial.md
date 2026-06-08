# Historial Service

## Descripción general

El `historial-service` es el microservicio encargado de administrar el historial de reproducción de los perfiles dentro de la plataforma **Quetxal TV**.

Este servicio permite registrar el progreso de visualización de películas y series, consultar los contenidos pendientes para la sección **Continuar viendo** y obtener el historial reciente de reproducción de un perfil.

El servicio fue desarrollado en **Python** y expone comunicación interna mediante **gRPC**, utilizando contratos definidos con **Protocol Buffers**.

---

## Responsabilidades del servicio

El servicio de historial maneja las siguientes funcionalidades:

* Registrar el progreso de reproducción por perfil.
* Guardar el minuto actual de una película.
* Guardar el progreso de una serie por temporada, episodio y minuto.
* Consultar los contenidos pendientes en la sección **Continuar viendo**.
* Consultar el historial de reproducción de un perfil.
* Consumir procedimientos almacenados, funciones, triggers y vistas del esquema `playback`.

---

## Tecnología utilizada

| Elemento             | Tecnología       |
| -------------------- | ---------------- |
| Lenguaje             | Python           |
| Comunicación interna | gRPC             |
| Contratos            | Protocol Buffers |
| Base de datos        | PostgreSQL       |
| Puerto del servicio  | 50054            |
| Contenedores         | Docker           |

---

## Ubicación del servicio

El microservicio se encuentra en la siguiente ruta del proyecto:

```txt
app/QuetxalTV/microservices/historial-service
```

El contrato `.proto` se encuentra en:

```txt
app/QuetxalTV/proto/historial.proto
```

El script de base de datos utilizado por el servicio se encuentra en:

```txt
app/QuetxalTV/database/historial.sql
```

---

## Estructura implementada

```txt
historial-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── history/
│   │   ├── __init__.py
│   │   ├── handler.py
│   │   ├── service.py
│   │   └── repository.py
│   └── proto/
│       ├── __init__.py
│       ├── historial_pb2.py
│       └── historial_pb2_grpc.py
├── Dockerfile
├── .env.example
├── requirements.txt
└── historial.md
```

---

## Archivos principales

| Archivo            | Descripción                                              |
| ------------------ | -------------------------------------------------------- |
| `main.py`          | Levanta el servidor gRPC del servicio de historial       |
| `config.py`        | Lee las variables de entorno necesarias para el servicio |
| `handler.py`       | Implementa los métodos gRPC definidos en el contrato     |
| `service.py`       | Contiene la lógica de negocio del historial              |
| `repository.py`    | Se encarga de la conexión y consultas hacia PostgreSQL   |
| `historial.proto`  | Define el contrato gRPC del servicio                     |
| `requirements.txt` | Contiene las dependencias necesarias de Python           |
| `Dockerfile`       | Define la imagen Docker del microservicio                |
| `.env.example`     | Archivo de ejemplo para configurar variables de entorno  |

---

## Comunicación del servicio

El servicio expone comunicación interna mediante gRPC en el puerto:

```txt
50054
```

Este microservicio no llama directamente a otros microservicios. Su responsabilidad principal es manejar su propia base de datos de historial.

Cuando se necesite mostrar información enriquecida como título, portada, descripción o datos del contenido, el **API Gateway** puede consultar este servicio para obtener los IDs del historial y luego consultar el servicio de catálogo para completar la información visual.

---

## Contrato gRPC

El contrato principal se encuentra en:

```txt
app/QuetxalTV/proto/historial.proto
```

El servicio expone los siguientes métodos:

| Método                      | Descripción                                                |
| --------------------------- | ---------------------------------------------------------- |
| `GuardarProgreso`           | Guarda o actualiza el progreso de una película o serie     |
| `ObtenerContinuarViendo`    | Devuelve los contenidos no completados de un perfil        |
| `ObtenerHistorialPorPerfil` | Devuelve el historial general de reproducción de un perfil |

---

## Método: GuardarProgreso

Este método registra o actualiza el avance de reproducción de un contenido.

### Para películas

Cuando el contenido es una película, se envían los siguientes datos:

```txt
profile_id
content_id
content_type = MOVIE
minute_reached
total_duration_min
```

El servicio ejecuta el procedimiento almacenado:

```sql
CALL playback.sp_update_movie_progress(...)
```

Este procedimiento crea o actualiza el progreso de una película para un perfil.

---

### Para series

Cuando el contenido es una serie, se envían los siguientes datos:

```txt
profile_id
content_id
content_type = SERIES
season_id
episode_id
season_num
episode_num
minute_reached
total_duration_min
```

El servicio ejecuta el procedimiento almacenado:

```sql
CALL playback.sp_update_episode_progress(...)
```

Este procedimiento crea o actualiza el progreso general de la serie y también el progreso específico del episodio visto.

---

## Método: ObtenerContinuarViendo

Este método permite obtener los contenidos pendientes de terminar para un perfil.

El servicio ejecuta la función:

```sql
SELECT * FROM playback.fn_get_continue_watching(...)
```

La respuesta incluye información como:

```txt
progress_id
profile_id
content_id
content_type
minute_reached
completion_pct
last_watched_at
last_episode_id
last_season_num
last_episode_num
last_ep_minute
```

En el caso de series, la respuesta incluye el último episodio visto, la temporada, el número de episodio y el minuto exacto donde el usuario se quedó.

---

## Método: ObtenerHistorialPorPerfil

Este método obtiene el historial general de reproducción de un perfil.

El servicio consulta la vista:

```sql
playback.v_watch_history_summary
```

Esta vista resume el estado de reproducción de cada contenido, incluyendo el porcentaje de avance, el minuto alcanzado, si el contenido fue completado y la información del último episodio visto en caso de series.

---

## Base de datos

El servicio utiliza PostgreSQL y trabaja sobre el esquema:

```sql
playback
```

El script `historial.sql` contiene los siguientes elementos principales:

| Elemento                        | Descripción                                                             |
| ------------------------------- | ----------------------------------------------------------------------- |
| `watch_progress`                | Tabla principal del progreso por perfil y contenido                     |
| `watch_progress_episode`        | Tabla del progreso específico por episodio                              |
| `fn_get_last_episode`           | Función para obtener el último episodio visto                           |
| `fn_get_continue_watching`      | Función para consultar la sección Continuar viendo                      |
| `sp_update_movie_progress`      | Procedimiento para guardar progreso de película                         |
| `sp_update_episode_progress`    | Procedimiento para guardar progreso de serie                            |
| `trg_auto_mark_completed_movie` | Trigger para marcar películas como completadas                          |
| `trg_auto_mark_ep_completed`    | Trigger para marcar episodios como completados                          |
| `trg_sync_series_progress`      | Trigger para sincronizar el progreso de la serie con el episodio actual |
| `v_watch_history_summary`       | Vista resumen del historial de reproducción                             |

---

## Variables de entorno

El servicio utiliza variables de entorno para configurar el puerto y la conexión con PostgreSQL.

Archivo de ejemplo:

```txt
.env.example
```

Contenido:

```env
HISTORIAL_SERVICE_PORT=50054

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quetxaltv_historial
DB_USER=postgres
DB_PASSWORD=postgres
```

Para pruebas locales se puede crear un archivo `.env`, pero este archivo no debe subirse al repositorio.

Ejemplo usado en ambiente local:

```env
HISTORIAL_SERVICE_PORT=50054

DB_HOST=localhost
DB_PORT=5434
DB_NAME=quetxaltv_historial
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## Instalación local

Entrar a la carpeta del servicio:

```powershell
cd app/QuetxalTV/microservices/historial-service
```

Crear entorno virtual:

```powershell
python -m venv venv
```

Activar entorno virtual:

```powershell
.\venv\Scripts\activate
```

Instalar dependencias:

```powershell
pip install -r requirements.txt
```

---

## Compilación del contrato gRPC

Desde la carpeta del servicio, ejecutar:

```powershell
python -m grpc_tools.protoc -I..\..\proto --python_out=.\app\proto --grpc_python_out=.\app\proto ..\..\proto\historial.proto
```

Este comando genera los archivos:

```txt
app/proto/historial_pb2.py
app/proto/historial_pb2_grpc.py
```

---

## Ejecución del servicio

Desde la carpeta del servicio, ejecutar:

```powershell
python -m app.main
```

Salida esperada:

```txt
Historial Service iniciado en puerto 50054
```

Para detener el servicio:

```txt
CTRL + C
```

---

## Prueba local con PostgreSQL

Para levantar la base de datos local de historial con Docker:

```powershell
docker run --name quetxaltv-historial-db `
  -e POSTGRES_DB=quetxaltv_historial `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5434:5432 `
  -d postgres:15-alpine
```

Copiar el script SQL al contenedor:

```powershell
docker cp .\app\QuetxalTV\database\historial.sql quetxaltv-historial-db:/historial.sql
```

Ejecutar el script:

```powershell
docker exec -it quetxaltv-historial-db psql -U postgres -d quetxaltv_historial -f /historial.sql
```

---

## Pruebas realizadas

### Prueba de película

Se validó correctamente el flujo:

```txt
Guardar progreso de película
Consultar continuar viendo
```

Ejemplo de resultado obtenido:

```txt
success: true
message: "Progreso de película guardado correctamente"

content_type: "MOVIE"
minute_reached: 35
completion_pct: 29.17
```

---

### Prueba de serie

Se validó correctamente el flujo:

```txt
Guardar progreso de serie
Guardar temporada
Guardar episodio
Guardar minuto actual
Consultar continuar viendo
```

Ejemplo de resultado obtenido:

```txt
success: true
message: "Progreso de serie guardado correctamente"

content_type: "SERIES"
minute_reached: 18
last_episode_id: "55555555-5555-5555-5555-555555555555"
last_season_num: 2
last_episode_num: 4
last_ep_minute: 18
```

---

## Estado actual del servicio

Actualmente el microservicio cuenta con:

* Servidor gRPC funcional.
* Contrato Protocol Buffers.
* Conexión con PostgreSQL.
* Uso del esquema `playback`.
* Registro de progreso de películas.
* Registro de progreso de series.
* Registro de temporada, episodio y minuto exacto.
* Consulta de contenidos para **Continuar viendo**.
* Uso de procedimientos almacenados.
* Uso de funciones de base de datos.
* Uso de triggers.
* Uso de vista resumen del historial.
* Dockerfile inicial.
* Variables de entorno de ejemplo.

---

## Observaciones

* El servicio no utiliza FastAPI actualmente; se implementó con gRPC porque la comunicación interna del proyecto se definió mediante Protocol Buffers y gRPC.
* Los IDs `profile_id`, `content_id`, `season_id` y `episode_id` se manejan como UUID en la base de datos y como `string` en el contrato gRPC.
* La información visual del contenido, como título o portada, debe ser enriquecida por el API Gateway consultando el servicio de catálogo.
