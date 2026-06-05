
Gestionar monetización.

Maneja
* Planes
* Suscripciones
* Pagos
* Historial de compras
* Cancelaciones

Se comunica con
```
    FX Service
    Notification Service
```

Flujo
```
    Obtiene tipo de cambio
    Procesa compra
    Envía recibo
```


```
streaming-platform/
│
├── proto/
│
├── api-gateway/
│
├── auth-service/
│
├── catalog-service/
│
├── subscription-service/          <-- Go + Gin | Puerto 50053
│   ├── cmd/
│   │   └── main.go
│   ├── internal/
│   │   ├── plans/
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   └── repository.go
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   └── database/
│   │       ├── migrations/
│   │       └── stored_procedures/
│   ├── proto/
│   ├── Dockerfile
│   ├── .env
│   └── go.mod
│
├── history-service/
│
├── fx-notification-service/
│
├── .gitignore                     <-- Incluye todos los .env
└── README.md

```