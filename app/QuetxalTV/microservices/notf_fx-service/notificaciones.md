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
├── fx-notification-service/       <-- Python + FastAPI | Puerto 50055
│   ├── app/
│   │   ├── main.py
│   │   ├── fx/
│   │   │   ├── handler.py
│   │   │   ├── service.py         <-- Consulta API externa de divisas
│   │   │   └── redis_cache.py     <-- Lógica de caché con TTL
│   │   ├── notifications/
│   │   │   ├── handler.py
│   │   │   ├── service.py         <-- Envío de correos (SMTP)
│   │   │   └── templates/         <-- Templates HTML de emails
│   │   └── proto/
│   ├── Dockerfile
│   ├── .env
│   └── requirements.txt
├── .gitignore                     <-- Incluye todos los .env
└── README.md