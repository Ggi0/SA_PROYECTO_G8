import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

# ─── Conexión a Redis ────────────────────────────────────
class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )
        self.ttl = int(os.getenv("REDIS_TTL", 3600))

    def get_rate(self, currency: str) -> dict | None:
        """Busca tipo de cambio en caché."""
        try:
            data = self.client.get(f"fx:rate:{currency}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Redis] Error al leer caché: {e}")
            return None

    def set_rate(self, currency: str, rate_data: dict) -> bool:
        """Guarda tipo de cambio en caché con TTL."""
        try:
            self.client.setex(
                f"fx:rate:{currency}",
                self.ttl,
                json.dumps(rate_data)
            )
            return True
        except Exception as e:
            print(f"[Redis] Error al guardar caché: {e}")
            return False

    def get_all_rates(self) -> dict | None:
        """Busca todos los tipos de cambio en caché."""
        try:
            data = self.client.get("fx:rates:all")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Redis] Error al leer caché global: {e}")
            return None

    def set_all_rates(self, rates: dict) -> bool:
        """Guarda todos los tipos de cambio en caché."""
        try:
            self.client.setex(
                "fx:rates:all",
                self.ttl,
                json.dumps(rates)
            )
            return True
        except Exception as e:
            print(f"[Redis] Error al guardar caché global: {e}")
            return False

    def ping(self) -> bool:
        """Verifica conexión con Redis."""
        try:
            return self.client.ping()
        except Exception:
            return False


# ─── Instancia global ────────────────────────────────────
redis_client = RedisClient()