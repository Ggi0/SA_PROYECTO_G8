streaming-platform/
│
├── proto/
│
├── api-gateway/
│
├── auth-service/
│
├── catalog-service/               <-- Go + Gin | Puerto 50052
│   ├── cmd/
│   │   └── main.go                <-- Levanta servidor gRPC
│   ├── internal/
│   │   ├── catalog/
│   │   │   ├── handler.go         <-- Implementa métodos gRPC
│   │   │   ├── service.go
│   │   │   └── repository.go
│   │   ├── genres/
│   │   ├── actors/
│   │   ├── ratings/
│   │   └── database/
│   │       ├── migrations/
│   │       └── stored_procedures/
│   ├── proto/                     <-- .proto compilados para Go
│   ├── Dockerfile
│   ├── .env
│   └── go.mod
│