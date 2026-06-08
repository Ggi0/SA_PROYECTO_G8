package main

import (
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/quetxaltv/catalog-service/internal/catalog"
	"github.com/quetxaltv/catalog-service/internal/database"
	pb "github.com/quetxaltv/catalog-service/proto/catalog"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Archivo .env no encontrado, usando variables del entorno")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Error conectando a la base de datos: %v", err)
	}
	defer db.Close()

	repo := catalog.NewRepository(db)
	svc := catalog.NewService(repo)
	handler := catalog.NewHandler(svc)

	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "50052"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("Error iniciando listener: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterCatalogServiceServer(grpcServer, handler)

	// Reflection permite usar grpcurl sin necesitar el .proto
	reflection.Register(grpcServer)

	log.Printf("Catalog Service escuchando en :%s (gRPC)", port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Error en servidor gRPC: %v", err)
	}
}
