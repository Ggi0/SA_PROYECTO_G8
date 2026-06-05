Guardar progreso de visualización.

Maneja
* Continue Watching
* Progreso de películas
* Progreso de series
* Último episodio visto
* Minuto actual

Se comunica con
```
    nadie
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
├── history-service/               <-- Python + FastAPI | Puerto 50054
│   ├── app/
│   │   ├── main.py                <-- Levanta servidor gRPC
│   │   ├── history/
│   │   │   ├── handler.py         <-- Implementa métodos gRPC
│   │   │   ├── service.py
│   │   │   └── repository.py
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── stored_procedures/
│   │   └── proto/                 <-- .proto compilados para Python
│   ├── Dockerfile
│   ├── .env
│   └── requirements.txt
│
├── .gitignore                     <-- Incluye todos los .env
└── README.md

```