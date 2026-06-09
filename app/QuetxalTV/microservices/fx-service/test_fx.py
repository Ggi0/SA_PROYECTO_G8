import asyncio
import grpc
from src.grpc import fx_pb2, fx_pb2_grpc

async def test():
    # Conectar al servidor gRPC
    channel = grpc.aio.insecure_channel("localhost:50054")
    stub = fx_pb2_grpc.FxServiceStub(channel)

    print("\n─── Test 1: Obtener tipo de cambio GTQ ───")
    response = await stub.GetExchangeRate(
        fx_pb2.ExchangeRateRequest(
            target_currency="GTQ",
            requested_by="test"
        )
    )
    print(f"Éxito: {response.success}")
    print(f"1 USD = {response.rate} {response.currency_code} {response.symbol}")
    print(f"Fuente: {response.source}")

    print("\n─── Test 2: Convertir $9.99 USD a GTQ ───")
    response2 = await stub.ConvertAmount(
        fx_pb2.ConvertAmountRequest(
            amount=9.99,
            target_currency="GTQ",
            requested_by="test"
        )
    )
    print(f"Éxito: {response2.success}")
    print(f"${response2.original_amount} USD = {response2.symbol}{response2.converted_amount} GTQ")

    print("\n─── Test 3: Obtener todos los rates ───")
    response3 = await stub.GetAllRates(
        fx_pb2.AllRatesRequest(requested_by="test")
    )
    print(f"Éxito: {response3.success}")
    for rate in response3.rates:
        print(f"  {rate.currency_code}: {rate.rate} {rate.symbol}")

    await channel.close()

asyncio.run(test())