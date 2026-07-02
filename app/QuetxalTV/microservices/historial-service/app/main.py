import os
import sys
from concurrent import futures

import grpc
from grpc_health.v1 import health_pb2, health_pb2_grpc

from app.config import Config

# Necesario para que los archivos generados por gRPC puedan importar historial_pb2
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROTO_DIR = os.path.join(CURRENT_DIR, "proto")
sys.path.append(PROTO_DIR)

from app.history.handler import HistorialHandler
from app.history.repository import HistorialRepository
from app.proto import historial_pb2_grpc


class HealthServicer(health_pb2_grpc.HealthServicer):
    def Check(self, request, context):
        if request.service == "historial-service-readiness":
            try:
                if not HistorialRepository().verificar_conexion_base_datos():
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


def serve():
    config = Config()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    health_pb2_grpc.add_HealthServicer_to_server(HealthServicer(), server)

    historial_pb2_grpc.add_HistorialServiceServicer_to_server(
        HistorialHandler(),
        server
    )

    server.add_insecure_port(f"[::]:{config.HISTORIAL_SERVICE_PORT}")

    print(f"Historial Service iniciado en puerto {config.HISTORIAL_SERVICE_PORT}")

    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
