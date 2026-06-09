# ─── Imagen base ─────────────────────────────────────────
FROM python:3.11-slim

# ─── Directorio de trabajo ───────────────────────────────
WORKDIR /app

# ─── Instalar dependencias del sistema ───────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ─── Copiar requirements e instalar ─────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Copiar código fuente ────────────────────────────────
COPY . .

# ─── Copiar proto y generar código gRPC ─────────────────
COPY ../../proto/fx.proto ./proto/fx.proto
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=src/grpc \
    --pyi_out=src/grpc \
    --grpc_python_out=src/grpc \
    ./proto/fx.proto

# ─── Puerto gRPC ─────────────────────────────────────────
EXPOSE 50054

# ─── Comando de inicio ───────────────────────────────────
CMD ["python", "-m", "src.main"]