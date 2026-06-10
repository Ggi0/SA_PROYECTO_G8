#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.cloud.yml}"

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Elimina imagenes antiguas que ya no estan siendo usadas por ningun contenedor.
docker image prune -af
