# Documentación: Algoritmo de Recomendación — Quetxal TV

**Proyecto Final — Software Avanzado, USAC**  
**Grupo 8**

| Carné | Nombre |
|---|---|
| 202100229 | Giovanni Saul Concohá Cax |
| 202200214 | Pablo Alejandro Marroquín Cutz |
| 201602619 | María de los Ángeles Paz de León |
| 202180003 | Ángel Isaías Mendoza Martínez |
| 202001814 | Naomi Rashel Yos Cujcuj |

---

## Índice

1. [Selección del algoritmo: inspiración en Netflix](#1-selección-del-algoritmo-inspiración-en-netflix)
2. [Explicación teórica del algoritmo](#2-explicación-teórica-del-algoritmo)
3. [Modelo matemático / lógico](#3-modelo-matemático--lógico)
4. [Arquitectura del sistema de calificación](#4-arquitectura-del-sistema-de-calificación)
5. [Implementación en Quetxal TV](#5-implementación-en-quetxal-tv)
   - [Capa de base de datos (PostgreSQL)](#capa-de-base-de-datos-postgresql)
   - [Capa de servicio (Go — catalogo-service)](#capa-de-servicio-go--catalogo-service)
   - [Capa de exposición (API Gateway → Frontend)](#capa-de-exposición-api-gateway--frontend)
6. [Flujo completo de una calificación](#6-flujo-completo-de-una-calificación)
7. [Justificación arquitectónica de las decisiones de diseño](#7-justificación-arquitectónica-de-las-decisiones-de-diseño)
8. [Comparación con el algoritmo de Netflix](#8-comparación-con-el-algoritmo-de-netflix)
9. [Limitaciones y posibles extensiones](#9-limitaciones-y-posibles-extensiones)

---

## 1. Selección del algoritmo: inspiración en Netflix

Netflix utiliza un sistema de recomendación **híbrido** que combina múltiples señales:

1. **Calificación explícita**: el usuario indica si le gustó un contenido (👍 / 👎, antes era de 1–5 estrellas)
2. **Filtrado colaborativo**: usuarios con gustos similares ven contenido similar
3. **Filtrado basado en contenido**: características del contenido (género, elenco, sinopsis)
4. **Comportamiento implícito**: tiempo de visualización, repeticiones, búsquedas

Para Quetxal TV se seleccionó e implementó el **primer nivel del sistema de Netflix**: el sistema de **calificación explícita dual** (thumbs up/down + estrellas 1-5) que Netflix utilizó hasta 2017 y que sigue siendo la base de su modelo de señal de preferencias del usuario.

### ¿Por qué este algoritmo?

| Criterio | Justificación |
|---|---|
| **Adecuado al alcance** | Una plataforma nueva no tiene suficiente historial para filtrado colaborativo efectivo |
| **Interpretable** | El `recommendation_pct` es comprensible directamente por el usuario final |
| **Sin cold start en señal** | Funciona desde la primera calificación, no necesita masa crítica de datos |
| **Bajo costo computacional** | Se calcula con SQL puro, sin modelos ML que requieran infraestructura adicional |
| **Base para evolución** | Los datos de `ratings` son el insumo directo para implementar filtrado colaborativo en una fase futura |

---

## 2. Explicación teórica del algoritmo

### 2.1 Sistema de calificación dual de Netflix (2006–2017)

Netflix descubrió mediante investigación que **las calificaciones de 1 a 5 estrellas generaban ruido**: los usuarios raramente usaban calificaciones intermedias y existía sesgo de positividad (dificultad para dar 1 estrella aunque el contenido fuera malo). En 2017 Netflix migró a un sistema de **thumbs up / thumbs down** porque:

- Es más rápido de dar (un clic vs. una escala)
- Reduce el sesgo cognitivo de la escala numérica
- El modelo matemático es más robusto con señales binarias
- Genera más calificaciones por usuario (mayor volumen de datos)

**Quetxal TV implementa ambos sistemas simultáneamente**, permitiendo que el usuario elija el nivel de granularidad que prefiere.

### 2.2 Porcentaje de coincidencia (Match Score)

Netflix llama a su métrica principal el **"% de coincidencia"** (*match score*): un porcentaje que indica qué tan probable es que a un usuario le guste un contenido **basado en la señal de la comunidad**. En Quetxal TV esta métrica se llama `recommendation_pct`.

A diferencia del rating promedio de estrellas, el porcentaje de recomendación es **resistente a la distribución bimodal** (muchos 5 estrellas y muchos 1 estrella, pocos intermedios). Un contenido polarizante puede tener 3.0 estrellas de promedio, pero si el 70% dio thumb up, el `recommendation_pct = 70%` es más informativo.

### 2.3 Señales del algoritmo en Quetxal TV

El algoritmo consume **dos tipos de señales explícitas**:

| Señal | Campo | Tipo | Descripción |
|---|---|---|---|
| **Thumb** | `ratings.thumb` | `'UP'` / `'DOWN'` | Señal binaria de aprobación/rechazo |
| **Estrellas** | `ratings.stars` | `1` a `5` | Calificación ordinal de 1 a 5 |

Ambas señales son **opcionales e independientes**: un usuario puede dar solo thumb, solo estrellas, o ambas. El constraint de la tabla garantiza que al menos una esté presente.

---

## 3. Modelo matemático / lógico

### 3.1 Fórmula del porcentaje de recomendación

El `recommendation_pct` se calcula como la fracción de votos positivos sobre el total de votos con thumb:

```
                    |{r ∈ R_c : r.thumb = 'UP'}|
rec_pct(c) =  ─────────────────────────────────────── × 100
                    |{r ∈ R_c : r.thumb ≠ NULL}|
```

Donde:
- `c` = contenido evaluado
- `R_c` = conjunto de ratings del contenido `c`
- `|·|` = cardinalidad del conjunto

**Caso especial:** si `|{r ∈ R_c : r.thumb ≠ NULL}| = 0` (nadie ha votado con thumb), la función retorna `NULL` en lugar de 0, para distinguir entre "0% recomendado" y "sin votos suficientes".

**Ejemplo numérico:**

```
Contenido: "El Laberinto del Fauno"
  - 47 votos thumb UP
  - 3 votos thumb DOWN
  - 8 votos solo con estrellas (thumb = NULL, excluidos del cálculo)

rec_pct = (47 / (47 + 3)) × 100 = (47 / 50) × 100 = 94.00%
```

### 3.2 Fórmula del promedio de estrellas

El `avg_stars` es la media aritmética estándar sobre los votos con estrellas:

```
                    Σ r.stars   (para todo r ∈ R_c con r.stars ≠ NULL)
avg_stars(c) =  ──────────────────────────────────────────────────────
                    |{r ∈ R_c : r.stars ≠ NULL}|
```

El resultado se redondea a 2 decimales. Si ningún usuario calificó con estrellas, retorna `NULL`.

**Ejemplo numérico:**

```
Votos con estrellas: [5, 4, 5, 3, 5, 4, 2, 5]
avg_stars = (5+4+5+3+5+4+2+5) / 8 = 33/8 = 4.13
```

### 3.3 Propiedades del modelo

| Propiedad | `recommendation_pct` | `avg_stars` |
|---|---|---|
| **Rango** | [0, 100] o NULL | [1.00, 5.00] o NULL |
| **Resistencia a outliers** | Alta (binaria, no hay valores extremos) | Media (outliers de 1 o 5 afectan la media) |
| **Interpretabilidad** | Alta ("94% de usuarios lo recomiendan") | Alta ("4.1 de 5 estrellas") |
| **Sensibilidad al volumen** | Baja (15 votos = mismo % que 1500 con misma proporción) | Baja (misma característica) |
| **Diferenciación** | Buena para comparar contenidos similares | Buena para contenidos con pocas reseñas |

### 3.4 Unicidad del voto (constraint de integridad)

Cada perfil tiene exactamente **un voto por contenido**. Si intenta calificar de nuevo, se actualiza el voto existente (upsert). Esta restricción se implementa mediante:

```sql
UNIQUE(content_id, profile_id)   -- en tabla ratings
```

Esto garantiza que un usuario no pueda inflar artificialmente el porcentaje votando múltiples veces.

---

## 4. Arquitectura del sistema de calificación

```
╔═══════════════════════════════════════════════════════════════════╗
║              FLUJO DEL SISTEMA DE CALIFICACIÓN                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌──────────┐   👍/👎 + ★★★★☆   ┌─────────────┐               ║
║  │ Frontend │──────────────────►  │  API Gateway│               ║
║  │ (React)  │◄──────────────────  │  (NestJS)   │               ║
║  └──────────┘   rec_pct + avg★   └──────┬──────┘               ║
║                                         │ gRPC RateContent       ║
║                                         ▼                        ║
║                                  ┌─────────────────────────┐     ║
║                                  │  catalogo-service (Go)  │     ║
║                                  │                         │     ║
║                                  │  service.RateContent()  │     ║
║                                  │  ├── repo.UpsertRating() │     ║
║                                  │  └── repo.GetRating     │     ║
║                                  │       Metrics()         │     ║
║                                  └──────────┬──────────────┘     ║
║                                             │ SQL                ║
║                                             ▼                    ║
║                                  ┌─────────────────────────┐     ║
║                                  │  PostgreSQL (catalog DB) │     ║
║                                  │                         │     ║
║                                  │  CALL sp_upsert_rating  │     ║
║                                  │  SELECT fn_recommendation│     ║
║                                  │         _percentage()   │     ║
║                                  │  SELECT fn_average_stars│     ║
║                                  └─────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Capas involucradas

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | React + TypeScript | Renderiza botones 👍/👎 y control de estrellas; muestra `recommendation_pct` |
| **API Gateway** | NestJS (TypeScript) | Autentica JWT, extrae `profile_id`, reenvía al microservicio por gRPC |
| **catalogo-service** | Go (gRPC) | Orquesta la lógica: llama al repositorio para upsert y luego recalcula métricas |
| **PostgreSQL** | `sp_upsert_rating` + `fn_recommendation_percentage` + `fn_average_stars` | Almacena el voto y calcula las métricas en tiempo real |

---

## 5. Implementación en Quetxal TV

### Capa de base de datos (PostgreSQL)

#### Tabla `ratings`

**Archivo:** `app/QuetxalTV/database/catalogo.sql`

```sql
-- Tabla central de calificaciones
-- Un perfil puede votar exactamente una vez por contenido
CREATE TABLE ratings (
    rating_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id  UUID NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    -- profile_id: viene del Auth Service, validado por JWT (sin FK real)
    profile_id  UUID NOT NULL,
    -- Sistema dual: thumb OR stars OR ambos
    thumb       VARCHAR(10) CHECK (thumb IN ('UP', 'DOWN', NULL)),
    stars       SMALLINT CHECK (stars BETWEEN 1 AND 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unicidad: un perfil, un voto por contenido
    UNIQUE(content_id, profile_id)
);
```

#### Trigger de validación

```sql
-- Garantiza que el usuario proporcione al menos una señal de calificación
CREATE OR REPLACE FUNCTION fn_validate_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.thumb IS NULL AND NEW.stars IS NULL THEN
        RAISE EXCEPTION 'Debe proporcionar al menos una calificación (thumb o stars).';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rating
    BEFORE INSERT OR UPDATE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_rating();
```

#### Stored Procedure: `sp_upsert_rating`

Implementa el patrón **upsert idempotente**: si el perfil ya votó, actualiza el voto; si no, lo inserta. Esto garantiza exactamente un voto por perfil.

```sql
CREATE OR REPLACE PROCEDURE sp_upsert_rating(
    p_content_id UUID,
    p_profile_id UUID,
    p_thumb      VARCHAR DEFAULT NULL,
    p_stars      SMALLINT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO ratings(content_id, profile_id, thumb, stars)
    VALUES (p_content_id, p_profile_id, p_thumb, p_stars)
    ON CONFLICT (content_id, profile_id)
    DO UPDATE SET
        thumb      = EXCLUDED.thumb,
        stars      = EXCLUDED.stars,
        created_at = NOW();   -- Registra la fecha del re-voto
END;
$$;
```

#### Función: `fn_recommendation_percentage`

Implementa la fórmula `rec_pct = (thumbs_up / total_con_thumb) * 100`.

```sql
-- Calcula el % de thumbs UP sobre el total de votos thumb
-- Retorna NULL si no hay votos thumb (no muestra 0% falso)
CREATE OR REPLACE FUNCTION fn_recommendation_percentage(p_content_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total   INTEGER;
    v_up      INTEGER;
BEGIN
    SELECT
        COUNT(*),                                      -- total de votos con thumb
        COUNT(*) FILTER (WHERE thumb = 'UP')           -- solo thumbs UP
    INTO v_total, v_up
    FROM ratings
    WHERE content_id = p_content_id AND thumb IS NOT NULL;

    IF v_total = 0 THEN
        RETURN NULL;  -- Sin votos thumb, no mostramos porcentaje
    END IF;

    RETURN ROUND((v_up::NUMERIC / v_total) * 100, 2);
END;
$$;
```

#### Función: `fn_average_stars`

Calcula la media aritmética de las calificaciones de estrellas.

```sql
-- Calcula el promedio de estrellas (solo votos con stars != NULL)
-- Retorna NULL si nadie calificó con estrellas
CREATE OR REPLACE FUNCTION fn_average_stars(p_content_id UUID)
RETURNS NUMERIC(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg NUMERIC;
BEGIN
    SELECT AVG(stars) INTO v_avg
    FROM ratings
    WHERE content_id = p_content_id AND stars IS NOT NULL;

    RETURN ROUND(v_avg, 2);
END;
$$;
```

#### Vista: `v_catalog_card`

Las métricas se calculan **en tiempo real** para cada item del catálogo. Cada vez que el Gateway consulta el catálogo, la vista ejecuta las funciones y devuelve los valores actualizados.

```sql
CREATE OR REPLACE VIEW v_catalog_card AS
SELECT
    c.content_id,
    c.content_type,
    c.title,
    c.release_year,
    c.duration_min,
    c.rating_class,
    c.poster_url,
    c.published_at,
    -- Géneros como array
    COALESCE(
        ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
        '{}'
    ) AS genres,
    -- Métricas de recomendación (calculadas en tiempo real)
    fn_recommendation_percentage(c.content_id) AS recommendation_pct,
    fn_average_stars(c.content_id)             AS avg_stars,
    (SELECT COUNT(*) FROM ratings r
     WHERE r.content_id = c.content_id)        AS total_votes
FROM content c
LEFT JOIN content_genres cg ON c.content_id = cg.content_id
LEFT JOIN genres g ON cg.genre_id = g.genre_id
WHERE c.is_published = TRUE
GROUP BY c.content_id;
```

---

### Capa de servicio (Go — catalogo-service)

**Archivo:** `app/QuetxalTV/microservices/catalogo-service/internal/catalog/service.go`

```go
// RateContent procesa la calificación de un usuario sobre un contenido.
// 1. Persiste el voto (upsert)
// 2. Recalcula y retorna las métricas actualizadas
func (s *Service) RateContent(contentID, profileID, thumb string, stars int) (*pb.RateContentResponse, error) {
    // Paso 1: Insertar o actualizar el voto del perfil
    if err := s.repo.UpsertRating(contentID, profileID, thumb, stars); err != nil {
        return nil, fmt.Errorf("RateContent: %w", err)
    }

    // Paso 2: Recalcular las métricas en tiempo real
    recPct, avgStars, err := s.repo.GetRatingMetrics(contentID)
    if err != nil {
        return nil, err
    }

    // Retornar las métricas actualizadas al Gateway
    return &pb.RateContentResponse{
        Success:           true,
        RecommendationPct: recPct,    // nuevo rec_pct post-voto
        AvgStars:          avgStars,  // nuevo avg_stars post-voto
    }, nil
}
```

**Archivo:** `app/QuetxalTV/microservices/catalogo-service/internal/catalog/repository.go`

```go
// UpsertRating llama al stored procedure sp_upsert_rating.
// thumb vacío o stars=0 se convierten a NULL (el SP acepta parciales).
func (r *Repository) UpsertRating(contentID, profileID, thumb string, stars int) error {
    var thumbArg any = nil
    if thumb != "" {
        thumbArg = thumb   // "UP" o "DOWN"
    }
    var starsArg any = nil
    if stars > 0 {
        starsArg = stars   // 1 a 5
    }

    _, err := r.db.Exec(`CALL sp_upsert_rating($1, $2, $3, $4)`,
        contentID, profileID, thumbArg, starsArg)
    return err
}

// GetRatingMetrics ejecuta ambas funciones SQL y retorna las métricas actualizadas.
func (r *Repository) GetRatingMetrics(contentID string) (recPct, avgStars float64, err error) {
    err = r.db.QueryRow(`
        SELECT COALESCE(fn_recommendation_percentage($1), 0),
               COALESCE(fn_average_stars($1), 0)`, contentID).Scan(&recPct, &avgStars)
    return
}
```

---

### Capa de exposición (API Gateway → Frontend)

El API Gateway recibe la solicitud de calificación del frontend y la reenvía al `catalogo-service` por gRPC:

```
Frontend envía:
  POST /catalog/{contentId}/rate
  Body: { "thumb": "UP", "stars": 4, "profileId": "<uuid-del-perfil>" }
  Header: Authorization: Bearer <JWT>

API Gateway recibe:
  profile_id = body.profileId (enviado explícitamente por el frontend)
  Nota: JWT.sub contiene el userId, no el profileId.
        El profileId activo está en JWT.activeProfileId, pero para
        ratings el frontend lo envía directamente en el body.

Respuesta del microservicio (proto):
  message RateContentResponse {
    bool    success            = 1;
    double  recommendation_pct = 2;   // ej: 94.00
    double  avg_stars          = 3;   // ej: 4.13
  }

Frontend recibe y actualiza la UI:
  "94% de usuarios lo recomiendan"
  ★★★★☆ (4.1)
```

---

## 6. Flujo completo de una calificación

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FLUJO COMPLETO: USUARIO CALIFICA                  │
└─────────────────────────────────────────────────────────────────────┘

1. Usuario ve "El Laberinto del Fauno" y hace clic en 👍 + ★★★★★

2. Frontend → POST /catalog/{contentId}/rate
   { thumb: "UP", stars: 5 }
   Authorization: Bearer eyJ...

3. API Gateway:
   ├── Verifica JWT ✓
   ├── Extrae profile_id del token
   └── gRPC → catalogo-service: RateContent(contentId, profileId, "UP", 5)

4. catalogo-service:
   ├── repo.UpsertRating(contentId, profileId, "UP", 5)
   │   └── CALL sp_upsert_rating($1, $2, $3, $4)
   │       ├── Si (contentId, profileId) ya existe → UPDATE thumb='UP', stars=5
   │       └── Si no existe → INSERT (contentId, profileId, 'UP', 5)
   │
   └── repo.GetRatingMetrics(contentId)
       └── SELECT fn_recommendation_percentage($1),
                  fn_average_stars($1)
           ├── fn_recommendation_percentage:
           │   v_total = 50 (todos con thumb)
           │   v_up    = 48 (incluye el nuevo voto)
           │   RETURN ROUND((48/50)*100, 2) = 96.00
           │
           └── fn_average_stars:
               AVG(stars) de todos los votos con stars
               RETURN ROUND(4.27, 2)

5. Respuesta: { success: true, recommendation_pct: 96.00, avg_stars: 4.27 }

6. Frontend actualiza la UI en tiempo real:
   "96% de usuarios lo recomiendan" ↑ (antes era 94%)
   ★★★★☆ (4.3)
```

---

## 7. Justificación arquitectónica de las decisiones de diseño

### 7.1 Cálculo en base de datos, no en la capa de aplicación

**Decisión**: las funciones `fn_recommendation_percentage` y `fn_average_stars` se implementaron como funciones SQL en PostgreSQL, no como lógica en Go o Python.

**Justificación**:
- **Consistencia transaccional**: el cálculo ocurre dentro del motor de BD, donde el voto ya fue persistido. No hay ventana de tiempo donde el voto existe pero la métrica no está actualizada.
- **Rendimiento**: PostgreSQL ejecuta el `COUNT` y `AVG` con acceso directo a los índices (`idx_ratings_content`) sin serialización de datos por red.
- **Centralización**: si en el futuro hay múltiples servicios que necesiten la métrica, consultan la misma función, no hay riesgo de inconsistencias entre implementaciones.

### 7.2 Sistema dual (thumb + stars) en lugar de solo uno

**Decisión**: se implementaron ambos sistemas de calificación con ambas columnas opcionales.

**Justificación**:
- **Flexibilidad de UX**: el equipo de frontend puede elegir mostrar solo thumbs (más simple) o solo estrellas (más granular) según el diseño de la pantalla.
- **Máxima información**: si el usuario proporciona ambas señales, ambas se almacenan. El `recommendation_pct` usa thumbs (señal más robusta estadísticamente), y `avg_stars` usa estrellas (más expresivo para el usuario).
- **Alineación con Netflix**: Netflix mantuvo ambos sistemas en paralelo durante años antes de eliminar las estrellas.

### 7.3 `UNIQUE(content_id, profile_id)` en lugar de validación en aplicación

**Decisión**: la unicidad del voto se garantiza por constraint de base de datos, no por validación en el servicio Go.

**Justificación**: si el constraint estuviera solo en la capa de aplicación, dos requests simultáneas del mismo usuario (doble clic, red inestable) podrían crear dos votos. El constraint de BD es atómico y elimina la condición de carrera sin necesidad de locks en la aplicación.

### 7.4 `ON CONFLICT ... DO UPDATE` (upsert) en lugar de DELETE + INSERT

**Decisión**: el stored procedure `sp_upsert_rating` usa `INSERT ... ON CONFLICT DO UPDATE`.

**Justificación**: el patrón upsert es **idempotente** y opera en una sola transacción. Un DELETE + INSERT crearía un nuevo `rating_id` (pérdida de trazabilidad histórica) y abriría una ventana de inconsistencia entre ambas operaciones.

### 7.5 Retorno `NULL` en lugar de `0` cuando no hay votos

**Decisión**: `fn_recommendation_percentage` retorna `NULL` si no hay votos con thumb (no `0`).

**Justificación**: un `recommendation_pct = 0%` significaría "todos lo odian". `NULL` significa "sin datos suficientes". El frontend puede distinguir entre ambos casos y mostrar un mensaje diferente ("Sé el primero en calificar" vs. "0% lo recomiendan").

---

## 8. Comparación con el algoritmo de Netflix

| Aspecto | Netflix (2006-2017) | Quetxal TV |
|---|---|---|
| **Señal de calificación** | 1-5 estrellas → luego thumbs | Thumb UP/DOWN + 1-5 estrellas (dual) |
| **Métrica principal** | Predicted star rating → Match % | `recommendation_pct` (thumb UP / total thumb) |
| **Personalización** | Por usuario (filtrado colaborativo) | Por contenido (agregado de todos los usuarios) |
| **Filtrado colaborativo** | Sí (vecinos más cercanos → matrix factorization) | No implementado (futura extensión) |
| **Cold start** | Problema conocido, mitigado con onboarding | No aplica (la métrica es comunal, no individual) |
| **Cálculo** | ML en batch (Spark/TensorFlow) | SQL en tiempo real (PostgreSQL functions) |
| **Almacenamiento de señales** | Cassandra distribuido | PostgreSQL tabla `ratings` |
| **Unicidad del voto** | Garantizada por sistema de usuarios | `UNIQUE(content_id, profile_id)` en BD |

---

## 9. Limitaciones y posibles extensiones

### Limitaciones actuales

| Limitación | Descripción |
|---|---|
| **No personalizado** | Todos los usuarios ven el mismo `recommendation_pct`, no se calcula por usuario |
| **Sin filtrado colaborativo** | No se analizan usuarios con gustos similares para hacer recomendaciones |
| **Sin señal implícita** | El sistema no considera tiempo de visualización, repeticiones ni abandono |
| **Cold start de contenido** | Contenido recién agregado no tiene métricas hasta que alguien vota |
| **Cálculo en tiempo real** | Para grandes volúmenes (millones de votos), las funciones SQL podrían ser lentas |

### Extensiones planificadas

| Extensión | Descripción técnica |
|---|---|
| **Filtrado colaborativo** | Matrix Factorization (SVD) sobre la tabla `ratings` para calcular similitud entre perfiles |
| **Recomendaciones personalizadas** | `GET /catalog/recommended?profileId=...` que devuelva contenido con alta similitud |
| **Señal implícita** | Integrar `watch_progress.completion_pct` del historial-service como señal de engagement |
| **Caché de métricas** | Precalcular `recommendation_pct` y `avg_stars` con un job en batch y almacenar en Redis para escalar |
| **Ponderación por volumen** | Aplicar **Wilson Score Interval** para penalizar contenidos con pocos votos: `lower_bound = (p̂ + z²/2n - z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)` |

### Wilson Score: la siguiente evolución natural

El `recommendation_pct` actual no penaliza contenidos con pocos votos. Con 1 voto UP y 0 DOWN, `rec_pct = 100%`, pero ese porcentaje no es confiable estadísticamente. La extensión natural es el **Wilson Score Interval** (usado por Reddit para ordenar comentarios):

```
                    p̂ + z²/2n - z√( p̂(1-p̂)/n + z²/4n² )
wilson_lower(c) = ─────────────────────────────────────────────
                              1 + z²/n

donde:
  p̂ = recommendation_pct / 100  (proporción observada)
  n = total de votos con thumb
  z = 1.96 (para 95% de confianza)
```

Este score es conservador: con pocos votos, asigna un score bajo aunque todos sean positivos. Con muchos votos, converge al `recommendation_pct` real.
