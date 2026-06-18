FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=src/grpc \
    --pyi_out=src/grpc \
    --grpc_python_out=src/grpc \
    ./proto/fx.proto

EXPOSE 50054

CMD ["python", "-m", "src.main"]
