import asyncio
import os
import sys


sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "grpc"))

from grpc import aio
from dotenv import load_dotenv
from grpc_health.v1 import health_pb2, health_pb2_grpc
from src.cache.redis_client import redis_client
from src.db.database import db
from src.grpc import fx_pb2_grpc
from src.grpc.fx_server import FXServiceServicer
from src.grpc.audit_http_fx import start_audit_thread

load_dotenv()


class HealthServicer(health_pb2_grpc.HealthServicer):
    async def Check(self, request, context):
        if request.service == "fx-service-readiness":
            try:
                db.ensure_connection()
                if db.conn is None or db.conn.closed or not redis_client.ping():
                    return health_pb2.HealthCheckResponse(
                        status=health_pb2.HealthCheckResponse.NOT_SERVING
                    )
            except Exception:
                return health_pb2.HealthCheckResponse(
                    status=health_pb2.HealthCheckResponse.NOT_SERVING
                )

        return health_pb2.HealthCheckResponse(
            status=health_pb2.HealthCheckResponse.SERVING
        )

    async def Watch(self, request, context):
        await context.abort(grpc.StatusCode.UNIMPLEMENTED, "Watch is not implemented")

# ─── Servidor gRPC principal ─────────────────────────────
async def serve():
    port = os.getenv("GRPC_PORT", "50054")
    server = aio.server()

    # Registrar el servicio
    health_pb2_grpc.add_HealthServicer_to_server(HealthServicer(), server)
    fx_pb2_grpc.add_FxServiceServicer_to_server(FXServiceServicer(), server)

    # Escuchar en el puerto
    listen_addr = f"0.0.0.0:{port}"
    server.add_insecure_port(listen_addr)

    print(f"[FX Service] Iniciando servidor gRPC en {listen_addr}")
    await server.start()
    print(f"[FX Service] Servidor listo ✓")
    start_audit_thread()
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        print("[FX Service] Deteniendo servidor...")
        await server.stop(0)


if __name__ == "__main__":
    asyncio.run(serve())
