FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o catalog-service ./cmd/main.go

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/catalog-service .

# Directorio para uploads locales (en producción se usa GCS)
RUN mkdir -p /app/uploads

EXPOSE 50052
EXPOSE 8082

CMD ["./catalog-service"]
