#!/usr/bin/env bash
set -euo pipefail
BASE=/opt/quetxal/migrations
# contenedor -> carpeta de migraciones del servicio
declare -A SVC=( [auth-db]=auth [subscription-db]=subscription [catalogo-db]=catalogo \
                 [fx-db]=fx [notification-db]=notification [historial-db]=historial )

for c in "${!SVC[@]}"; do
  dir="$BASE/${SVC[$c]}"
  [ -d "$dir" ] || { echo "(sin migraciones para $c)"; continue; }

  # Tabla de control de migraciones aplicadas (idempotente)
  docker exec "$c" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "CREATE TABLE IF NOT EXISTS public.schema_migrations(filename text PRIMARY KEY, applied_at timestamptz DEFAULT now());"'

  for f in $(ls "$dir"/*.sql 2>/dev/null | sort); do
    name=$(basename "$f")
    done_=$(docker exec "$c" sh -c "psql -tA -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \
      -c \"SELECT 1 FROM public.schema_migrations WHERE filename='$name'\"")
    if [ "$done_" = "1" ]; then echo "✔ ya aplicada: $c/$name"; continue; fi
    echo "→ aplicando: $c/$name"
    docker exec -i "$c" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$f"
    docker exec "$c" sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \
      -c \"INSERT INTO public.schema_migrations(filename) VALUES('$name')\""
  done
done
echo "✅ Migraciones al día"