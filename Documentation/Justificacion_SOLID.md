# Justificación de Principios SOLID en Quetxal TV

## 1. Introducción

En el proyecto Quetxal TV se aplicaron los principios SOLID con el objetivo de mantener una arquitectura ordenada, modular y fácil de extender. El sistema fue desarrollado bajo una arquitectura orientada a servicios y microservicios, por lo que era importante evitar que cada módulo dependiera directamente de la lógica interna de otros componentes.

Los principios SOLID se utilizaron principalmente en:

- Separación de responsabilidades por microservicio.
- Separación de capas dentro de cada servicio.
- Uso de contratos gRPC mediante Protocol Buffers.
- Modularización del API Gateway.
- Separación entre controladores, servicios y repositorios.
- Uso de inyección de dependencias.
- Facilidad para probar componentes de forma aislada.

La estructura general del sistema sigue el flujo:

```txt
Frontend → API Gateway → Microservicios → Base de datos correspondiente
```

Cada componente tiene una responsabilidad definida y se comunica con otros componentes mediante contratos claros.

---

## 2. S — Single Responsibility Principle

### Definición

El principio de responsabilidad única indica que una clase, módulo o componente debe tener una sola razón para cambiar. Es decir, cada parte del sistema debe encargarse de una responsabilidad específica.

### Aplicación en Quetxal TV

En el proyecto, este principio se aplicó separando las responsabilidades por microservicio:

| Servicio | Responsabilidad principal |
|---|---|
| Auth Service | Autenticación, usuarios, sesiones y perfiles. |
| Catalog Service | Gestión de películas, series, temporadas, episodios, géneros y calificaciones. |
| Subscription Service | Planes, suscripciones y pagos. |
| History Service | Progreso de reproducción, continuar viendo e historial. |
| Notification Service | Correos y notificaciones del sistema. |
| FX Service | Conversión de divisas y consulta de tasas de cambio. |
| API Gateway | Entrada única del frontend y comunicación con microservicios. |

También se aplicó dentro del `history-service`, separando el código en capas:

```txt
main.py        → Levanta el servidor gRPC.
handler.py     → Recibe solicitudes gRPC.
service.py     → Contiene lógica de negocio.
repository.py  → Accede a PostgreSQL.
config.py      → Lee variables de entorno.
```

Con esto, si cambia la conexión a base de datos, se modifica `repository.py`; si cambia la validación de negocio, se modifica `service.py`; y si cambia el contrato gRPC, se actualiza `handler.py`.

### Ejemplo de código

```python
# app/history/repository.py

class HistoryRepository:
    def __init__(self, config):
        self.config = config

    def guardar_progreso_pelicula(
        self,
        profile_id,
        content_id,
        minute_reached,
        total_duration_min
    ):
        """
        Responsabilidad única:
        ejecutar la operación de persistencia del progreso de una película.
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "CALL playback.sp_update_movie_progress(%s, %s, %s, %s)",
                    (profile_id, content_id, minute_reached, total_duration_min)
                )
                conn.commit()
        finally:
            conn.close()
```

```python
# app/history/service.py

class HistoryService:
    def __init__(self, repository):
        self.repository = repository

    def update_movie_progress(self, request):
        """
        Responsabilidad única:
        validar la solicitud y coordinar la operación de negocio.
        """
        if request.minute_reached < 0:
            return {
                "success": False,
                "message": "El minuto alcanzado no puede ser negativo"
            }

        return self.repository.guardar_progreso_pelicula(
            request.profile_id,
            request.content_id,
            request.minute_reached,
            request.total_duration_min
        )
```

### Por qué fue útil

Este principio permitió que cada archivo y cada microservicio tuviera una finalidad clara. Gracias a esto, el código es más fácil de mantener, probar y modificar sin afectar otras partes del sistema.

---

## 3. O — Open/Closed Principle

### Definición

El principio abierto/cerrado indica que el software debe estar abierto para extensión, pero cerrado para modificación. Esto significa que debe ser posible agregar nuevas funcionalidades sin alterar innecesariamente el código ya existente.

### Aplicación en Quetxal TV

Este principio se aplicó mediante:

- Contratos gRPC extensibles.
- Módulos independientes en NestJS.
- Servicios separados por dominio.
- Nuevos métodos agregados sin romper métodos existentes.
- Endpoints agregados en API Gateway sin modificar el comportamiento anterior.

Un ejemplo claro fue la incorporación de los health checks del `history-service`. Se agregaron métodos como:

```txt
HealthLive
HealthReady
```

sin eliminar ni modificar los métodos ya existentes:

```txt
UpdateMovieProgress
UpdateEpisodeProgress
GetContinueWatching
GetContentProgress
```

### Ejemplo de código

```proto
// proto/historial.proto

service HistorialService {
  rpc UpdateMovieProgress (UpdateMovieProgressRequest) returns (ProgressResponse);
  rpc UpdateEpisodeProgress (UpdateEpisodeProgressRequest) returns (ProgressResponse);
  rpc GetContinueWatching (GetContinueWatchingRequest) returns (ContinueWatchingResponse);
  rpc GetContentProgress (GetContentProgressRequest) returns (ProgressResponse);

  // Nuevos métodos agregados sin romper los anteriores
  rpc HealthLive (HealthCheckRequest) returns (HealthCheckResponse);
  rpc HealthReady (HealthCheckRequest) returns (HealthCheckResponse);
}
```

```ts
// api-gateway/src/health.controller.ts

@Controller('health')
export class HealthController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('live')
  check() {
    return {
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway está vivo',
    };
  }

  @Get('ready')
  async ready() {
    const historial = await this.historialService.healthReady();

    if (!historial.success) {
      return {
        status: 'not_ready',
        service: 'api-gateway',
        message: 'API Gateway no está listo porque historial-service no respondió correctamente',
        checks: { historial },
      };
    }

    return {
      status: 'ready',
      service: 'api-gateway',
      message: 'API Gateway listo para recibir tráfico',
      checks: { historial },
    };
  }
}
```

### Por qué fue útil

El sistema pudo crecer agregando auditoría, health checks y nuevas rutas administrativas sin reescribir módulos existentes. Esto reduce el riesgo de introducir errores en funcionalidades que ya estaban funcionando.

---

## 4. L — Liskov Substitution Principle

### Definición

El principio de sustitución de Liskov indica que una clase o implementación debe poder ser reemplazada por otra que cumpla el mismo contrato sin alterar el comportamiento esperado del sistema.

### Aplicación en Quetxal TV

En el proyecto este principio se refleja principalmente en el uso de contratos. Los servicios se comunican mediante interfaces gRPC definidas en archivos `.proto`. Si un cliente espera un `HistorialService`, cualquier implementación que respete ese contrato puede ser utilizada por el API Gateway.

También se aplicó en las pruebas, donde se puede reemplazar un servicio real por un mock que conserva la misma estructura esperada.

### Ejemplo de código

```ts
// api-gateway/src/historial/historial.service.ts

export interface HistoryAuditLogItem {
  audit_id: string;
  responsible_user_id: string;
  responsible_profile_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_state: string;
  new_state: string;
  created_at: string;
}

export interface HistoryAuditLogsResponse {
  items: HistoryAuditLogItem[];
}
```

```ts
// api-gateway/src/health.controller.spec.ts

const historialServiceMock = {
  healthReady: jest.fn().mockReturnValue(
    of({
      success: true,
      status: 'READY',
      service: 'historial-service',
      message: 'Historial service está listo y conectado a la base de datos',
    }),
  ),
} as unknown as HistorialService;

controller = new HealthController(historialServiceMock);
```

El controlador puede trabajar con `historialServiceMock` durante pruebas o con `HistorialService` real durante ejecución, siempre que ambos respeten el comportamiento esperado.

### Por qué fue útil

Esto facilitó las pruebas unitarias y permitió desacoplar el API Gateway de la implementación concreta del microservicio. Mientras se respete el contrato, el componente puede sustituirse sin alterar el resto del sistema.

---

## 5. I — Interface Segregation Principle

### Definición

El principio de segregación de interfaces indica que un cliente no debe depender de métodos que no utiliza. En lugar de crear interfaces enormes, conviene dividir los contratos por responsabilidades específicas.

### Aplicación en Quetxal TV

En el proyecto, los contratos se separaron por servicio:

| Archivo `.proto` | Responsabilidad |
|---|---|
| `historial.proto` | Progreso, continuar viendo, auditoría de historial y health checks de historial. |
| `fx.proto` | Conversión de divisas y consulta de tasas. |
| `subscription.proto` | Planes, suscripciones y pagos. |
| `catalog.proto` | Contenido, películas, series, temporadas y episodios. |
| `notification.proto` | Notificaciones y correos. |

Esto evita tener un contrato gigante con métodos de todos los módulos. Cada servicio expone únicamente las operaciones relacionadas con su dominio.

### Ejemplo de código

```proto
// proto/historial.proto

service HistorialService {
  rpc UpdateMovieProgress (UpdateMovieProgressRequest) returns (ProgressResponse);
  rpc UpdateEpisodeProgress (UpdateEpisodeProgressRequest) returns (ProgressResponse);
  rpc GetContinueWatching (GetContinueWatchingRequest) returns (ContinueWatchingResponse);
  rpc GetContentProgress (GetContentProgressRequest) returns (ProgressResponse);
  rpc GetHistoryAuditLogs (HistoryAuditLogsRequest) returns (HistoryAuditLogsResponse);
  rpc HealthLive (HealthCheckRequest) returns (HealthCheckResponse);
  rpc HealthReady (HealthCheckRequest) returns (HealthCheckResponse);
}
```

```proto
// proto/fx.proto

service FxService {
  rpc GetExchangeRate (ExchangeRateRequest) returns (ExchangeRateResponse);
  rpc GetAllRates (AllRatesRequest) returns (AllRatesResponse);
  rpc ConvertAmount (ConvertAmountRequest) returns (ConvertAmountResponse);
}
```

El `history-service` no necesita conocer métodos de conversión de divisas y el `fx-service` no necesita conocer métodos de historial. Cada interfaz se mantiene enfocada.

### Por qué fue útil

Este principio permitió que cada equipo trabajara en su contrato sin interferir con otros servicios. También facilitó la lectura, mantenimiento y evolución independiente de cada módulo.

---

## 6. D — Dependency Inversion Principle

### Definición

El principio de inversión de dependencias indica que los módulos de alto nivel no deben depender directamente de módulos de bajo nivel, sino de abstracciones o contratos. Además, los detalles de implementación deben depender de esas abstracciones.

### Aplicación en Quetxal TV

Este principio se aplicó principalmente en:

- Inyección de dependencias de NestJS.
- Clientes gRPC configurados en módulos.
- Separación entre controlador y servicio.
- Separación entre servicio y repositorio en Python.
- Uso de contratos `.proto` en lugar de llamadas directas entre servicios.

El `HealthController` no crea manualmente el cliente gRPC ni conoce cómo se conecta con el microservicio. Solo depende de `HistorialService`, que encapsula los detalles de comunicación.

### Ejemplo de código

```ts
// api-gateway/src/historial/historial.module.ts

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'HISTORIAL_PACKAGE',
        useFactory: () => ({
          transport: Transport.GRPC,
          options: {
            package: 'historial',
            protoPath: join(__dirname, '../proto/historial.proto'),
            url: process.env.HISTORIAL_SERVICE_URL || 'localhost:50055',
          },
        }),
      },
    ]),
  ],
  controllers: [HistorialController],
  providers: [HistorialService],
  exports: [HistorialService],
})
export class HistorialModule {}
```

```ts
// api-gateway/src/health.controller.ts

@Controller('health')
export class HealthController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('ready')
  async ready() {
    return this.historialService.healthReady();
  }
}
```

```python
# app/history/service.py

class HistoryService:
    def __init__(self, repository):
        self.repository = repository

    def get_continue_watching(self, profile_id, limit):
        return self.repository.obtener_continuar_viendo(profile_id, limit)
```

El servicio de negocio no necesita construir directamente la conexión a PostgreSQL. Depende de un repositorio que puede ser reemplazado o probado de forma aislada.

### Por qué fue útil

Este principio redujo el acoplamiento entre capas y permitió probar componentes sin depender de infraestructura real. También permitió cambiar detalles como URL del servicio, puerto, base de datos o cliente gRPC sin alterar el controlador principal.

---

## 7. Resumen de aplicación de SOLID

| Principio | Aplicación en Quetxal TV | Beneficio |
|---|---|---|
| SRP | Separación por microservicio y por capas internas. | Código más organizado y mantenible. |
| OCP | Nuevos métodos gRPC y endpoints sin romper funciones existentes. | Facilidad para extender el sistema. |
| LSP | Uso de contratos y mocks sustituibles. | Pruebas más simples y menor acoplamiento. |
| ISP | Contratos `.proto` separados por dominio. | Interfaces más claras y pequeñas. |
| DIP | Inyección de dependencias y uso de contratos. | Menor dependencia de implementaciones concretas. |

---

## 8. Conclusión

La aplicación de SOLID en Quetxal TV permitió construir una solución modular, escalable y fácil de mantener. Al separar responsabilidades, usar contratos claros, aplicar inyección de dependencias y mantener interfaces específicas por dominio, el proyecto quedó mejor preparado para crecer durante fases posteriores.

Estos principios fueron especialmente importantes porque el sistema está compuesto por varios microservicios y múltiples tecnologías. Sin una separación clara, los cambios en historial, catálogo, suscripciones, notificaciones o health checks habrían generado mayor riesgo de errores y mayor acoplamiento entre componentes.
