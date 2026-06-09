import httpx
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# ─── Cliente para ExchangeRate-API ──────────────────────
class ExchangeAPIClient:
    def __init__(self):
        self.api_key = os.getenv("EXCHANGE_API_KEY")
        self.base_url = os.getenv("EXCHANGE_API_URL")

    async def get_all_rates(self) -> dict | None:
        """
        Consulta todos los tipos de cambio desde la API externa.
        Retorna un dict con los rates o None si falla.
        """
        try:
            url = f"{self.base_url}/{self.api_key}/latest/USD"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                if data.get("result") != "success":
                    print(f"[ExchangeAPI] Error en respuesta: {data}")
                    return None

                return {
                    "rates": data["conversion_rates"],
                    "valid_at": datetime.now(timezone.utc).isoformat()
                }
        except httpx.TimeoutException:
            print("[ExchangeAPI] Timeout al consultar API")
            return None
        except httpx.HTTPError as e:
            print(f"[ExchangeAPI] HTTP Error: {e}")
            return None
        except Exception as e:
            print(f"[ExchangeAPI] Error inesperado: {e}")
            return None

    async def get_rate(self, currency: str) -> dict | None:
        """
        Consulta el tipo de cambio de una divisa específica.
        """
        try:
            url = f"{self.base_url}/{self.api_key}/pair/USD/{currency}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                if data.get("result") != "success":
                    print(f"[ExchangeAPI] Error en respuesta: {data}")
                    return None

                return {
                    "currency": currency,
                    "rate": data["conversion_rate"],
                    "valid_at": datetime.now(timezone.utc).isoformat()
                }
        except Exception as e:
            print(f"[ExchangeAPI] Error al obtener {currency}: {e}")
            return None


# ─── Instancia global ────────────────────────────────────
exchange_api = ExchangeAPIClient()