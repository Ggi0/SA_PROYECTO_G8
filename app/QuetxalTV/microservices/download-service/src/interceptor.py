import grpc
import jwt
import logging
import os
from typing import Callable

logger = logging.getLogger("download-service.interceptor")


class JWTInterceptor(grpc.ServerInterceptor):
    """
    Interceptor gRPC que valida el JWT antes de procesar
    cualquier petición al download-service.
    """

    def __init__(self, jwt_secret: str):
        self.jwt_secret = jwt_secret

    def intercept_service(self, continuation: Callable, handler_call_details):
        # Extraer metadata del request
        metadata = dict(handler_call_details.invocation_metadata)
        token = metadata.get("authorization", "")

        if not token.startswith("Bearer "):
            logger.warning("JWT ausente o mal formado")
            return self._abort(grpc.StatusCode.UNAUTHENTICATED, "Token JWT requerido.")

        token = token.removeprefix("Bearer ").strip()

        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"]
            )
            logger.info(
                "JWT válido | user=%s plan=%s",
                payload.get("user_id"), payload.get("plan")
            )
        except jwt.ExpiredSignatureError:
            logger.warning("JWT expirado")
            return self._abort(grpc.StatusCode.UNAUTHENTICATED, "Token JWT expirado.")
        except jwt.InvalidTokenError as e:
            logger.warning("JWT inválido: %s", str(e))
            return self._abort(grpc.StatusCode.UNAUTHENTICATED, "Token JWT inválido.")

        return continuation(handler_call_details)

    def _abort(self, code: grpc.StatusCode, message: str):
        def abort_handler(request, context):
            context.abort(code, message)
        return grpc.unary_unary_rpc_method_handler(abort_handler)
