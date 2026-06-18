package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/quetxaltv/catalog-service/internal/audit"
	"github.com/quetxaltv/catalog-service/internal/catalog"
	"github.com/quetxaltv/catalog-service/internal/database"
	"github.com/quetxaltv/catalog-service/internal/storage"
	pb "github.com/quetxaltv/catalog-service/proto/catalog"
)

type grpcHealthServer struct {
	healthpb.UnimplementedHealthServer
	db *sql.DB
}

func (s *grpcHealthServer) Check(ctx context.Context, req *healthpb.HealthCheckRequest) (*healthpb.HealthCheckResponse, error) {
	if req.GetService() == "catalogo-service-readiness" {
		if err := s.db.PingContext(ctx); err != nil {
			return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_NOT_SERVING}, nil
		}
	}

	return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_SERVING}, nil
}

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

	// Storage: GCS en producción, local en desarrollo
	store := storage.New()
	signer := storage.NewSigner()

	// Servidor HTTP: auditoría + health checks + upload
	httpPort := os.Getenv("AUDIT_HTTP_PORT")
	if httpPort == "" {
		httpPort = "8082"
	}
	mux := http.NewServeMux()
	audit.NewHandler(svc).RegisterRoutes(mux)
	storage.RegisterRoutes(mux, store, signer)
	registerHealthRoutes(mux, db)

	go func() {
		log.Printf("HTTP server escuchando en :%s (audit + health + upload)", httpPort)
		if err := http.ListenAndServe(":"+httpPort, mux); err != nil {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50052"
	}

	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Error iniciando listener: %v", err)
	}

	grpcServer := grpc.NewServer()
	healthpb.RegisterHealthServer(grpcServer, &grpcHealthServer{db: db})

	pb.RegisterCatalogServiceServer(grpcServer, handler)
	reflection.Register(grpcServer)

	log.Printf("Catalog Service escuchando en :%s (gRPC)", grpcPort)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Error en servidor gRPC: %v", err)
	}
}

// registerHealthRoutes agrega /healthz y /readyz al mux.
func registerHealthRoutes(mux *http.ServeMux, db *sql.DB) {
	// Liveness: el proceso está vivo
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Readiness: la BD responde
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := db.Ping(); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"status": "unavailable", "error": err.Error()})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
	})
}
