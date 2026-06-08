FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# Copia todo el código incluyendo proto/catalog/ ya generado
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o catalog-service ./cmd/main.go

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/catalog-service .

EXPOSE 50052

CMD ["./catalog-service"]
