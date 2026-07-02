import grpc
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(__file__))

from src.grpc import fx_pb2, fx_pb2_grpc
from src.services.fx_service import fx_service

class FXServiceServicer(fx_pb2_grpc.FxServiceServicer):

    async def GetExchangeRate(self, request, context):
        try:
            result = await fx_service.get_exchange_rate(
                currency=request.target_currency,
                requested_by=request.requested_by
            )
            return fx_pb2.ExchangeRateResponse(
                currency_code=result["currency_code"],
                currency_name=result["currency_name"],
                symbol=result["symbol"],
                rate=result["rate"],
                source=result["source"],
                valid_at=result["valid_at"],
                success=result["success"],
                error_message=result.get("error_message", "")
            )
        except Exception as e:
            return fx_pb2.ExchangeRateResponse(
                success=False,
                error_message=str(e)
            )

    async def GetAllRates(self, request, context):
        try:
            rates = await fx_service.get_all_rates(
                requested_by=request.requested_by
            )
            rate_items = [
                fx_pb2.RateItem(
                    currency_code=r["currency_code"],
                    currency_name=r["currency_name"],
                    symbol=r["symbol"],
                    rate=r["rate"]
                )
                for r in rates
            ]
            return fx_pb2.AllRatesResponse(
                rates=rate_items,
                success=True,
                error_message=""
            )
        except Exception as e:
            return fx_pb2.AllRatesResponse(
                success=False,
                error_message=str(e)
            )

    async def ConvertAmount(self, request, context):
        try:
            result = await fx_service.convert_amount(
                amount=request.amount,
                currency=request.target_currency,
                requested_by=request.requested_by
            )
            return fx_pb2.ConvertAmountResponse(
                original_amount=result["original_amount"],
                converted_amount=result["converted_amount"],
                currency_code=result["currency_code"],
                symbol=result["symbol"],
                rate=result["rate"],
                success=result["success"],
                error_message=result.get("error_message", "")
            )
        except Exception as e:
            return fx_pb2.ConvertAmountResponse(
                success=False,
                error_message=str(e)
            )
