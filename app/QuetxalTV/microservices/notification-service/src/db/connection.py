import psycopg2
import src.config as config

def get_connection():
    conn = psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        dbname=config.DB_NAME,
        options=f"-c search_path={config.DB_SCHEMA}"
    )
    return conn