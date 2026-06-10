FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Genera los stubs de gRPC dentro del contenedor
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=src/grpc \
    --pyi_out=src/grpc \
    --grpc_python_out=src/grpc \
    ./proto/notification.proto

CMD ["python", "-m", "src.grpc.server"]