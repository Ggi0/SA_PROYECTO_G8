import asyncio
import os
import sys


sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "grpc"))

from grpc import aio
from dotenv import load_dotenv
from src.grpc import fx_pb2_grpc
from src.grpc.fx_server import FXServiceServicer
from src.grpc.audit_http import start_audit_thread

load_dotenv()

# ─── Servidor gRPC principal ─────────────────────────────
async def serve():
    port = os.getenv("GRPC_PORT", "50054")
    server = aio.server()

    # Registrar el servicio
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
