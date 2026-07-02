package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
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
	registerRecommendationsRoute(mux, repo)

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

// registerRecommendationsRoute agrega /recommendations al mux HTTP.
func registerRecommendationsRoute(mux *http.ServeMux, repo *catalog.Repository) {
	mux.HandleFunc("/recommendations", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		profileID := r.URL.Query().Get("profile_id")
		maxRating := r.URL.Query().Get("max_rating")
		if maxRating == "" {
			maxRating = "NC-17"
		}
		limitStr := r.URL.Query().Get("limit")
		limit := 20
		if limitStr != "" {
			fmt.Sscanf(limitStr, "%d", &limit)
		}

		rows, err := repo.GetRecommendations(profileID, maxRating, limit)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		type recItem struct {
			ContentID         string  `json:"contentId"`
			ContentType       string  `json:"contentType"`
			Title             string  `json:"title"`
			ReleaseYear       int     `json:"releaseYear"`
			DurationMin       int     `json:"durationMin"`
			RatingClass       string  `json:"ratingClass"`
			PosterURL         string  `json:"posterUrl"`
			RecommendationPct float64 `json:"recommendationPct"`
			Score             float64 `json:"score"`
		}
		items := make([]recItem, 0, len(rows))
		for _, row := range rows {
			items = append(items, recItem{
				ContentID:         row.ContentID,
				ContentType:       row.ContentType,
				Title:             row.Title,
				ReleaseYear:       row.ReleaseYear,
				DurationMin:       row.DurationMin,
				RatingClass:       row.RatingClass,
				PosterURL:         row.PosterURL,
				RecommendationPct: row.RecommendationPct,
				Score:             row.Score,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"recommendations": items})
	})
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
