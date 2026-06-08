FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -o subscription-service ./cmd/main.go

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/subscription-service .
COPY --from=builder /app/internal/database/migrations ./migrations
COPY --from=builder /app/internal/database/stored_procedures ./stored_procedures

EXPOSE 50053

CMD ["./subscription-service"]
