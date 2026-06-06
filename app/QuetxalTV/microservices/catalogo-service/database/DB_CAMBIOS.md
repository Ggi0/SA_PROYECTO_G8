# Cambios y correcciones al schema de la base de datos

Este documento describe las diferencias entre el archivo original
`app/QuetxalTV/database/catalogo.sql` (hecho por el equipo de BD)
y el `init.sql` que usa el Catálogo Service localmente.

**El archivo original NO fue modificado.** Todos los ajustes están
en `database/init.sql` dentro de este servicio.

---

## Bug 1 — Nombre de schema inconsistente

### En `catalogo.sql` (original):
```sql
DROP SCHEMA IF EXISTS catalog CASCADE;
CREATE SCHEMA catalogo_DB;       -- ← crea "catalogo_DB"
SET search_path TO catalog;      -- ← busca "catalog" (no existe)
```

Las tablas quedan dentro de `catalogo_DB` pero el `search_path`
apunta a `catalog`, que fue recién eliminado. Cualquier query
posterior falla con "relation does not exist".

### En `init.sql` (corregido):
```sql
DROP SCHEMA IF EXISTS catalog CASCADE;
CREATE SCHEMA catalog;           -- nombre consistente
SET search_path TO catalog;
```

### Qué hay que corregir en el original:
Cambiar línea 8:
```sql
-- ANTES
CREATE SCHEMA catalogo_DB;

-- DESPUÉS
CREATE SCHEMA catalog;
```

---

## Bug 2 — `unaccent()` no es IMMUTABLE (falla el índice GIN)

### En `catalogo.sql` (original):
```sql
CREATE INDEX idx_content_search ON content USING GIN (
    to_tsvector('spanish', unaccent(title) || ' ' || COALESCE(unaccent(synopsis), ''))
);
```

PostgreSQL exige que las funciones usadas en expresiones de índice
sean `IMMUTABLE`. La función `unaccent` es `STABLE`, no `IMMUTABLE`,
por lo que el índice falla al crearse con:

```
ERROR: functions in index expression must be marked IMMUTABLE
```

### En `init.sql` (corregido):
Se crea una función wrapper inmutable **antes** de los índices:

```sql
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT unaccent('unaccent', $1) $$;
```

Y se usa en el índice y en `fn_search_content`:
```sql
CREATE INDEX idx_content_search ON content USING GIN (
    to_tsvector('spanish', f_unaccent(title) || ' ' || COALESCE(f_unaccent(synopsis), ''))
);
```

### Qué hay que corregir en el original:
1. Agregar la función `f_unaccent` después de `CREATE EXTENSION unaccent`
2. Reemplazar `unaccent(` por `f_unaccent(` en el índice y en `fn_search_content`

---

## Resumen de cambios pendientes en `catalogo.sql`

| # | Línea aprox. | Cambio |
|---|---|---|
| 1 | 8 | `CREATE SCHEMA catalogo_DB` → `CREATE SCHEMA catalog` |
| 2 | Después de línea 14 | Agregar función `f_unaccent` |
| 3 | ~150 | `unaccent(` → `f_unaccent(` en `idx_content_search` |
| 4 | ~210-245 | `unaccent(` → `f_unaccent(` en `fn_search_content` |

Con estos 4 cambios el archivo original queda funcional y el
servicio puede usarlo directamente sin necesitar `init.sql`.
