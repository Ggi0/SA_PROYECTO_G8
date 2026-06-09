import os
import sys
from concurrent import futures

import grpc

from app.config import Config

# Necesario para que los archivos generados por gRPC puedan importar historial_pb2
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROTO_DIR = os.path.join(CURRENT_DIR, "proto")
sys.path.append(PROTO_DIR)

from app.history.handler import HistorialHandler
from app.proto import historial_pb2_grpc


def serve():
    config = Config()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

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