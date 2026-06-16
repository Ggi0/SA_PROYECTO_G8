FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY microservices/fx-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY microservices/fx-service/ .
COPY proto/ ./proto/

# Compilar los archivos proto
RUN python -m grpc_tools.protoc \
    -I./proto/fx \
    --python_out=./src/grpc \
    --grpc_python_out=./src/grpc \
    ./proto/fx/fx.proto

# Corregir import relativo en el archivo generado
RUN sed -i 's/import fx_pb2 as fx__pb2/from src.grpc import fx_pb2 as fx__pb2/' ./src/grpc/fx_pb2_grpc.py

EXPOSE 50055

CMD ["python", "-m", "src.main"]