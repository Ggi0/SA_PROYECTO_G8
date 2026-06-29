# Justificación del Sistema de Base de Datos - Quetxal TV

El sistema utiliza principalmente PostgreSQL como base de datos relacional para los microservicios. Además, se utiliza Redis como caché para tasas de cambio del FX Service. La decisión responde a la necesidad de manejar datos estructurados, transacciones, integridad referencial, procedimientos almacenados, funciones, vistas y triggers de auditoría.

## Decisión tomada

Se decidió utilizar PostgreSQL por servicio, manteniendo separación de datos por dominio: autenticación, catálogo, suscripciones, historial, notificaciones, FX y descargas. Esto evita una base de datos centralizada única y mantiene bajo acoplamiento entre microservicios.

## ¿Por qué PostgreSQL?

- Soporta transacciones ACID.
- Permite claves foráneas y restricciones.
- Soporta funciones, procedimientos almacenados y triggers.
- Permite `JSONB` para auditoría de cambios.
- Es compatible con Go, Node.js/TypeScript y Python.
- Es adecuado para datos estructurados del negocio.

## Evidencia de uso en código

### Base de datos PostgreSQL en Docker Compose

Ruta: `app/QuetxalTV/docker-compose.local.yml`

```yaml
# ──────────────────────────────────────────────
  # AUTH
  # ──────────────────────────────────────────────
  auth-db:
    image: postgres:16-alpine
    container_name: auth-db
    ports:
      - "5434:5432"
    environment:
      POSTGRES_USER: auth_user
      POSTGRES_PASSWORD: admin
      POSTGRES_DB: auth_db
    volumes:
      - auth_db_data:/var/lib/postgresql/data
      - ./database/auth/auth.sql:/docker-entrypoint-initdb.d/01_auth.sql
      - ./database/auth/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U auth_user -d auth_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - quetxal-network

  auth-service:
    build:
      context: ./microservices/auth-service/auth-service
      dockerfile: Dockerfile
    ports:
      - "50051:50051"
    env_file:
      - path: ./microservices/auth-service/auth-service/.env
        required: false
    environment:
      GRPC_PORT: 50051
      NOTIFICATION_SERVICE_HOST: notification-service
      NOTIFICATION_SERVICE_PORT: 50056
      DB_HOST: auth-db
      DB_PORT: 5432
      DB_USER: auth_user
      DB_PASSWORD: admin
      DB_NAME: auth_db
      DB_SSLMODE: disable
      DB_SCHEMA: auth
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      auth-db:
        condition: service_healthy
```

### Conexión desde Go usando PostgreSQL

Ruta: `app/QuetxalTV/microservices/subscription-service/internal/database/postgres.go`

```go
package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func NewPostgresDB() (*sql.DB, error) {
	schema := getenv("DB_SCHEMA", "subscription")
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s options='-c search_path=%s,public'",
		getenv("DB_HOST", "localhost"),
		getenv("DB_PORT", "5432"),
		getenv("DB_USER", "subscription_user"),
		os.Getenv("DB_PASSWORD"),
		getenv("DB_NAME", "subscription_db"),
		getenv("DB_SSLMODE", "disable"),
		schema,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("open postgres connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	return db, nil
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
```

### Conexión desde Python usando psycopg2

Ruta: `app/QuetxalTV/microservices/historial-service/app/history/repository.py`

```python
import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import Config


class HistorialRepository:
    def __init__(self):
        self.config = Config()

    def get_connection(self):
        return psycopg2.connect(
            host=self.config.DB_HOST,
            port=self.config.DB_PORT,
            dbname=self.config.DB_NAME,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            sslmode=self.config.DB_SSLMODE,
            cursor_factory=RealDictCursor,
            options=f"-c search_path={self.config.DB_SCHEMA},public"
        )

    def guardar_progreso_pelicula(self, data):
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_movie_progress(
                %s::uuid,
                %s::uuid,
                %s::integer,
                %s::integer
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def guardar_progreso_serie(self, data):
        query = f"""
            CALL {self.config.DB_SCHEMA}.sp_update_episode_progress(
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::uuid,
                %s::smallint,
                %s::smallint,
                %s::integer,
                %s::integer
            );
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (
                    data["profile_id"],
                    data["content_id"],
                    data["season_id"],
                    data["episode_id"],
                    data["season_num"],
                    data["episode_num"],
                    data["minute_reached"],
                    data["total_duration_min"]
                ))
            conn.commit()

    def obtener_continuar_viendo(self, profile_id, limit=20):
        query = f"""
```

### Procedimiento transaccional de suscripción

Ruta: `app/QuetxalTV/database/subscription.sql`

```sql
--   2. Crea la suscripción (el trigger valida que no haya otra activa)
--   3. Registra el pago
-- Si cualquier paso falla, todo hace rollback.
-- El Subscription Service llama este SP después de confirmar el pago externo.

CREATE OR REPLACE PROCEDURE sp_create_subscription(
    p_user_id        UUID,
    p_plan_id        INT,
    p_amount_usd     NUMERIC(10,2),
    p_display_currency VARCHAR,
    p_display_amount   NUMERIC(10,2),
    p_gateway_ref    VARCHAR,
    p_payment_method VARCHAR,
    OUT p_subscription_id UUID,
    OUT p_payment_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_plan_price NUMERIC;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- 1. Validar plan
    SELECT price_usd INTO v_plan_price
    FROM plans
    WHERE plan_id = p_plan_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El plan % no existe o no está disponible.', p_plan_id;
    END IF;

    -- 2. Calcular fin de período (1 mes desde hoy)
    v_period_end := NOW() + INTERVAL '1 month';

    -- 3. Crear suscripción (el trigger trg_one_active_subscription valida aquí)
    INSERT INTO subscriptions(
        user_id, plan_id, status,
        current_period_start, current_period_end
    )
    VALUES (p_user_id, p_plan_id, 'ACTIVE', NOW(), v_period_end)
    RETURNING subscription_id INTO p_subscription_id;

    -- 4. Registrar el pago
    INSERT INTO payments(
        subscription_id, user_id, plan_id,
        amount_usd, display_currency, display_amount,
        status, gateway_ref, payment_method,
        period_start, period_end
    )
    VALUES (
        p_subscription_id, p_user_id, p_plan_id,
        p_amount_usd, p_display_currency, p_display_amount,
        'COMPLETED', p_gateway_ref, p_payment_method,
        NOW(), v_period_end
    )
    RETURNING payment_id INTO p_payment_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-lanzamos el error para que la aplicación sepa qué falló
        RAISE;
END;
$$;


-- PROCEDIMIENTO: sp_cancel_subscription
```

### Auditoría mediante triggers

Ruta: `app/QuetxalTV/database/subscription.sql`

```sql
CREATE OR REPLACE FUNCTION fn_subscription_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(current_setting('app.changed_by', true), 'system');
    IF v_changed_by = '' THEN
        v_changed_by := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', v_changed_by, NULL, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', v_changed_by, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'DELETE', v_changed_by, row_to_json(OLD)::JSONB, NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_plans
    AFTER INSERT OR UPDATE OR DELETE ON plans
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();

CREATE TRIGGER trg_audit_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();

CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_subscription_audit();

-- Trigger updated_at
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
```

## Uso de Redis como caché

Redis se utiliza en el FX Service para reducir llamadas repetitivas a APIs externas de tipos de cambio.

Ruta: `app/QuetxalTV/microservices/fx-service/src/cache/redis_client.py`

```python
import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

# ─── Conexión a Redis ────────────────────────────────────
class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )
        self.ttl = int(os.getenv("REDIS_TTL", 3600))

    def get_rate(self, currency: str) -> dict | None:
        """Busca tipo de cambio en caché."""
        try:
            data = self.client.get(f"fx:rate:{currency}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Redis] Error al leer caché: {e}")
            return None

    def set_rate(self, currency: str, rate_data: dict) -> bool:
        """Guarda tipo de cambio en caché con TTL."""
        try:
            self.client.setex(
                f"fx:rate:{currency}",
                self.ttl,
                json.dumps(rate_data)
            )
            return True
        except Exception as e:
            print(f"[Redis] Error al guardar caché: {e}")
            return False

    def get_all_rates(self) -> dict | None:
        """Busca todos los tipos de cambio en caché."""
        try:
            data = self.client.get("fx:rates:all")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Redis] Error al leer caché global: {e}")
            return None

    def set_all_rates(self, rates: dict) -> bool:
        """Guarda todos los tipos de cambio en caché."""
        try:
            self.client.setex(
                "fx:rates:all",
                self.ttl,
                json.dumps(rates)
            )
            return True
        except Exception as e:
            print(f"[Redis] Error al guardar caché global: {e}")
            return False

    def ping(self) -> bool:
        """Verifica conexión con Redis."""
        try:
            return self.client.ping()
        except Exception:
```

## Conclusión

PostgreSQL fue la elección adecuada para persistencia principal porque ofrece consistencia, transacciones y capacidad de ejecutar lógica cercana a los datos. Redis complementa esta decisión como caché temporal, reduciendo latencia y consumo de servicios externos.
