import os
from dotenv import load_dotenv

load_dotenv()

GRPC_PORT      = int(os.getenv("GRPC_PORT", 50055))
DB_HOST        = os.getenv("DB_HOST")
DB_PORT        = int(os.getenv("DB_PORT", 5432))
DB_USER        = os.getenv("DB_USER")
DB_PASSWORD    = os.getenv("DB_PASSWORD")
DB_NAME        = os.getenv("DB_NAME")
DB_SCHEMA      = os.getenv("DB_SCHEMA", "notification")

SMTP_HOST      = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT", 465))
SMTP_USER      = os.getenv("SMTP_USER")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD")
SMTP_FROM      = os.getenv("SMTP_FROM")