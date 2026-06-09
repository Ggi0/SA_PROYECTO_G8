import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    HISTORIAL_SERVICE_PORT = int(os.getenv("HISTORIAL_SERVICE_PORT", "50054"))

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "quetxaltv_historial")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_SSLMODE = os.getenv("DB_SSLMODE", "disable")
    DB_SCHEMA = os.getenv("DB_SCHEMA", "playback")