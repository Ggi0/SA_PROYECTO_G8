import grpc
import logging
import os
from concurrent import futures

import download_pb2
import download_pb2_grpc
from service import DownloadService
from interceptor import JWTInterceptor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("download-service")


def serve():
    port = os.getenv("GRPC_PORT", "50055")

    # Interceptor JWT — valida token antes de cada petición
    interceptor = JWTInterceptor(
        jwt_secret=os.getenv("JWT_SECRET", "dev-secret")
    )

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=[interceptor]
    )

    download_pb2_grpc.add_DownloadServiceServicer_to_server(
        DownloadService(), server
    )

    server.add_insecure_port(f"[::]:{port}")
    server.start()

    logger.info(f"✅ download-service escuchando en puerto {port}")
    logger.info("   Regla: Solo Plan PREMIUM puede descargar")

    server.wait_for_termination()


if __name__ == "__main__":
    serve()
