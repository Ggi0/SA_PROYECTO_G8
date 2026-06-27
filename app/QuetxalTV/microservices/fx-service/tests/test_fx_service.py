from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from src.services.fx_service import FxService
import src.services.fx_service as module


class FakeRedis:
    def __init__(self):
        self.rate = None
        self.rates = None

    def get_rate(self, currency):
        return self.rate

    def set_rate(self, currency, data):
        self.rate = data

    def get_all_rates(self):
        return self.rates

    def set_all_rates(self, rates):
        self.rates = rates


class FakeDb:
    currencies = [
        {"currency_code": "USD", "currency_name": "US Dollar", "symbol": "$"},
        {"currency_code": "GTQ", "currency_name": "Quetzal", "symbol": "Q"},
    ]

    def __init__(self):
        self.saved = []
        self.cache_hits = []
        self.latest = None

    def log_cache_hit(self, currency, rate, requested_by):
        self.cache_hits.append((currency, rate, requested_by))

    def save_rate(self, **kwargs):
        self.saved.append(kwargs)

    def get_all_currencies(self):
        return self.currencies

    def get_latest_rate(self, currency):
        return self.latest


class FakeExchangeApi:
    def __init__(self, rate=None, rates=None):
        self.rate = rate
        self.rates = rates

    async def get_rate(self, currency):
        return self.rate

    async def get_all_rates(self):
        return self.rates


@pytest.fixture()
def fakes(monkeypatch):
    redis = FakeRedis()
    db = FakeDb()
    api = FakeExchangeApi()
    monkeypatch.setattr(module, "redis_client", redis)
    monkeypatch.setattr(module, "db", db)
    monkeypatch.setattr(module, "exchange_api", api)
    return SimpleNamespace(redis=redis, db=db, api=api, service=FxService())


@pytest.mark.asyncio
async def test_get_exchange_rate_uses_cache(fakes):
    fakes.redis.rate = {"currency_code": "GTQ", "rate": 7.8}

    result = await fakes.service.get_exchange_rate("gtq", "tester")

    assert result["source"] == "cache"
    assert result["success"] is True
    assert fakes.db.cache_hits == [("GTQ", 7.8, "tester")]


@pytest.mark.asyncio
async def test_get_exchange_rate_uses_api_and_stores_rate(fakes):
    fakes.api.rate = {"rate": 7.75}

    result = await fakes.service.get_exchange_rate("GTQ")

    assert result["source"] == "api"
    assert result["currency_name"] == "Quetzal"
    assert fakes.db.saved[0]["currency"] == "GTQ"
    assert fakes.redis.rate["rate"] == 7.75


@pytest.mark.asyncio
async def test_get_exchange_rate_falls_back_to_database(fakes):
    fakes.db.latest = {
        "target_currency": "GTQ",
        "currency_name": "Quetzal",
        "symbol": "Q",
        "rate": 7.7,
        "valid_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }

    result = await fakes.service.get_exchange_rate("GTQ")
    assert result["source"] == "db_fallback"
    assert result["success"] is True


@pytest.mark.asyncio
async def test_get_exchange_rate_returns_failure_when_all_sources_fail(fakes):
    result = await fakes.service.get_exchange_rate("EUR")
    assert result["success"] is False
    assert result["source"] == "none"


@pytest.mark.asyncio
async def test_get_all_rates_cache_api_and_fallback(fakes):
    fakes.redis.rates = [{"currency_code": "GTQ", "rate": 7.8}]
    assert await fakes.service.get_all_rates() == fakes.redis.rates

    fakes.redis.rates = None
    fakes.api.rates = {"rates": {"GTQ": 7.75}}
    api_rates = await fakes.service.get_all_rates("tester")
    assert api_rates == [{"currency_code": "GTQ", "currency_name": "Quetzal", "symbol": "Q", "rate": 7.75}]

    fakes.redis.rates = None
    fakes.api.rates = None
    fakes.db.latest = {"rate": 7.7}
    fallback = await fakes.service.get_all_rates()
    assert fallback[0]["rate"] == 7.7


@pytest.mark.asyncio
async def test_convert_amount_success_and_failure(fakes):
    fakes.redis.rate = {"currency_code": "GTQ", "symbol": "Q", "rate": 7.8}
    success = await fakes.service.convert_amount(10, "GTQ")
    assert success["converted_amount"] == 78

    fakes.redis.rate = None
    failure = await fakes.service.convert_amount(10, "EUR")
    assert failure["success"] is False
