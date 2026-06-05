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
├── history-service/
│
├── fx-service/                            <-- Python | gRPC | 50055
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── exchange_rates/
│   │   │   ├── handler.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── provider_client.py
│   │   │
│   │   ├── redis/
│   │   │   ├── redis_client.py
│   │   │   └── cache_service.py
│   │   │
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   ├── procedures/
│   │   │   ├── functions/
│   │   │   ├── views/
│   │   │   └── triggers/
│   │   │
│   │   └── proto/
│   │
│   ├── Dockerfile
│   ├── .env
│   └── requirements.txt
│
├── notification-service/                 
│
├── .gitignore                     <-- Incluye todos los .env
└── README.md