from datetime import datetime, timezone
from src.cache.redis_client import redis_client
from src.db.database import db
from src.services.exchange_api import exchange_api

# ─── Lógica principal del FX Service ────────────────────
class FxService:

    async def get_exchange_rate(self, currency: str, requested_by: str = None) -> dict:
        """
        Obtiene el tipo de cambio para una divisa.
        Flujo: Redis → API externa → PostgreSQL (fallback)
        """
        currency = currency.upper()

        # 1. Buscar en Redis
        cached = redis_client.get_rate(currency)
        if cached:
            print(f"[FX] Cache HIT para {currency}")
            db.log_cache_hit(currency, cached["rate"], requested_by)
            return {**cached, "source": "cache", "success": True}

        # 2. Consultar API externa
        print(f"[FX] Cache MISS para {currency}, consultando API...")
        api_data = await exchange_api.get_rate(currency)

        if api_data:
            valid_at = datetime.now(timezone.utc)

            # Guardar en PostgreSQL
            db.save_rate(
                currency=currency,
                rate=api_data["rate"],
                source="exchangerate-api.com",
                valid_at=valid_at,
                requested_by=requested_by
            )

            # Obtener info de la divisa
            currencies = db.get_all_currencies()
            currency_info = next(
                (c for c in currencies if c["currency_code"] == currency),
                {"currency_name": currency, "symbol": ""}
            )

            rate_data = {
                "currency_code":  currency,
                "currency_name":  currency_info["currency_name"],
                "symbol":         currency_info["symbol"],
                "rate":           api_data["rate"],
                "valid_at":       valid_at.isoformat(),
                "source":         "api",
                "success":        True,
                "error_message":  ""
            }

            # Guardar en Redis
            redis_client.set_rate(currency, rate_data)
            return rate_data

        # 3. Fallback: usar último rate de PostgreSQL
        print(f"[FX] API falló, usando fallback de PostgreSQL para {currency}")
        db_rate = db.get_latest_rate(currency)

        if db_rate:
            return {
                "currency_code":  db_rate["target_currency"],
                "currency_name":  db_rate["currency_name"],
                "symbol":         db_rate["symbol"],
                "rate":           float(db_rate["rate"]),
                "valid_at":       db_rate["valid_at"].isoformat(),
                "source":         "db_fallback",
                "success":        True,
                "error_message":  ""
            }

        # 4. Todo falló
        return {
            "currency_code":  currency,
            "currency_name":  "",
            "symbol":         "",
            "rate":           0.0,
            "valid_at":       "",
            "source":         "none",
            "success":        False,
            "error_message":  f"No se pudo obtener el tipo de cambio para {currency}"
        }

    async def get_all_rates(self, requested_by: str = None) -> list:
        """
        Obtiene todos los tipos de cambio disponibles.
        Flujo: Redis → API externa → PostgreSQL (fallback)
        """
        # 1. Buscar en Redis
        cached = redis_client.get_all_rates()
        if cached:
            print("[FX] Cache HIT para todos los rates")
            return cached

        # 2. Consultar API externa
        print("[FX] Cache MISS para todos los rates, consultando API...")
        api_data = await exchange_api.get_all_rates()
        currencies = db.get_all_currencies()

        if api_data:
            valid_at = datetime.now(timezone.utc)
            rates = []

            for curr_info in currencies:
                code = curr_info["currency_code"]
                if code == "USD":
                    continue
                rate_value = api_data["rates"].get(code)
                if rate_value:
                    # Guardar cada rate en PostgreSQL
                    db.save_rate(
                        currency=code,
                        rate=rate_value,
                        source="exchangerate-api.com",
                        valid_at=valid_at,
                        requested_by=requested_by
                    )
                    rates.append({
                        "currency_code": code,
                        "currency_name": curr_info["currency_name"],
                        "symbol":        curr_info["symbol"],
                        "rate":          rate_value
                    })

            # Guardar en Redis
            redis_client.set_all_rates(rates)
            return rates

        # 3. Fallback: PostgreSQL
        print("[FX] API falló, usando fallback de PostgreSQL para todos los rates")
        fallback = []
        for curr_info in currencies:
            code = curr_info["currency_code"]
            if code == "USD":
                continue
            db_rate = db.get_latest_rate(code)
            if db_rate:
                fallback.append({
                    "currency_code": code,
                    "currency_name": curr_info["currency_name"],
                    "symbol":        curr_info["symbol"],
                    "rate":          float(db_rate["rate"])
                })

        return fallback

    async def convert_amount(self, amount: float, currency: str,
                             requested_by: str = None) -> dict:
        """
        Convierte un monto de USD a otra divisa.
        """
        rate_data = await self.get_exchange_rate(currency, requested_by)

        if not rate_data["success"]:
            return {
                "original_amount":  amount,
                "converted_amount": 0.0,
                "currency_code":    currency,
                "symbol":           "",
                "rate":             0.0,
                "success":          False,
                "error_message":    rate_data["error_message"]
            }

        converted = round(amount * rate_data["rate"], 2)
        return {
            "original_amount":  amount,
            "converted_amount": converted,
            "currency_code":    rate_data["currency_code"],
            "symbol":           rate_data["symbol"],
            "rate":             rate_data["rate"],
            "success":          True,
            "error_message":    ""
        }


# ─── Instancia global ────────────────────────────────────
fx_service = FxService()