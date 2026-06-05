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
├── notification-service/                  <-- Python | gRPC | 50056
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── notifications/
│   │   │   ├── handler.py
│   │   │   ├── service.py
│   │   │   └── repository.py
│   │   │
│   │   ├── email/
│   │   │   ├── smtp_client.py
│   │   │   ├── template_engine.py
│   │   │   └── sender.py
│   │   │
│   │   ├── templates/
│   │   │   ├── welcome.html
│   │   │   ├── purchase_receipt.html
│   │   │   └── new_content.html
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
├── .gitignore                     <-- Incluye todos los .env
└── README.md