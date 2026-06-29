import grpc
import logging

logger = logging.getLogger("download-service.interceptor")


class JWTInterceptor(grpc.ServerInterceptor):
    def __init__(self, jwt_secret: str):
        pass  # ya no necesitamos la clave

    def intercept_service(self, continuation, handler_call_details):
        # El api-gateway ya validó el JWT.
        # El download-service es interno — solo el api-gateway lo llama.
        return continuation(handler_call_details)

    def _abort(self, code, message):
        def abort_handler(request, context):
            context.abort(code, message)
        return grpc.unary_unary_rpc_method_handler(abort_handler)