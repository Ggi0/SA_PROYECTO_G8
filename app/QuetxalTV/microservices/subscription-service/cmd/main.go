package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"

	"subscription-service/internal/audit"
	"subscription-service/internal/clients"
	"subscription-service/internal/database"
	"subscription-service/internal/payments"
	"subscription-service/internal/plans"
	"subscription-service/internal/subscriptions"
	pb "subscription-service/proto/subscription"
)

type subscriptionServer struct {
	pb.UnimplementedSubscriptionServiceServer
	plansHandler    *plans.Handler
	subsHandler     *subscriptions.Handler
	paymentsHandler *payments.Handler
	auditHandler    *audit.Handler
}

type grpcHealthServer struct {
	healthpb.UnimplementedHealthServer
	db *sql.DB
}

func (s *grpcHealthServer) Check(ctx context.Context, req *healthpb.HealthCheckRequest) (*healthpb.HealthCheckResponse, error) {
	if req.GetService() == "subscription-service-readiness" {
		if err := s.db.PingContext(ctx); err != nil {
			return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_NOT_SERVING}, nil
		}
	}

	return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_SERVING}, nil
}

func (s *subscriptionServer) GetPlans(ctx context.Context, req *pb.GetPlansRequest) (*pb.GetPlansResponse, error) {
	return s.plansHandler.GetPlans(ctx, req)
}

func (s *subscriptionServer) GetPlanById(ctx context.Context, req *pb.GetPlanByIdRequest) (*pb.Plan, error) {
	return s.plansHandler.GetPlanById(ctx, req)
}

func (s *subscriptionServer) GetPlansWithRates(ctx context.Context, req *pb.GetPlansWithRatesRequest) (*pb.GetPlansWithRatesResponse, error) {
	return s.plansHandler.GetPlansWithRates(ctx, req)
}

func (s *subscriptionServer) Subscribe(ctx context.Context, req *pb.SubscribeRequest) (*pb.SubscribeResponse, error) {
	return s.subsHandler.Subscribe(ctx, req)
}

func (s *subscriptionServer) CancelSubscription(ctx context.Context, req *pb.CancelSubscriptionRequest) (*pb.CancelSubscriptionResponse, error) {
	return s.subsHandler.CancelSubscription(ctx, req)
}

func (s *subscriptionServer) GetUserSubscription(ctx context.Context, req *pb.GetUserSubscriptionRequest) (*pb.UserSubscriptionResponse, error) {
	return s.subsHandler.GetUserSubscription(ctx, req)
}

func (s *subscriptionServer) GetPaymentHistory(ctx context.Context, req *pb.GetPaymentHistoryRequest) (*pb.GetPaymentHistoryResponse, error) {
	return s.paymentsHandler.GetPaymentHistory(ctx, req)
}

func (s *subscriptionServer) GetAuditLogs(ctx context.Context, req *pb.GetAuditLogsRequest) (*pb.GetAuditLogsResponse, error) {
	return s.auditHandler.GetAuditLogs(ctx, req)
}

func (s *subscriptionServer) ExportAuditLog(ctx context.Context, req *pb.ExportAuditLogRequest) (*pb.ExportAuditLogResponse, error) {
	return s.auditHandler.ExportAuditLog(ctx, req)
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env found, using environment variables")
	}

	db, err := database.NewPostgresDB()
	if err != nil {
		log.Fatalf("error connecting to PostgreSQL: %v", err)
	}
	defer db.Close()

	fxClient, err := clients.NewFXClient()
	if err != nil {
		log.Printf("FX service unavailable: %v; USD fallback enabled", err)
		fxClient = clients.NewFallbackFXClient()
	}

	notifClient, err := clients.NewNotificationClient()
	if err != nil {
		log.Printf("Notification service unavailable: %v; receipts will be skipped", err)
		notifClient = clients.NewNoopNotificationClient()
	}

	planRepo := plans.NewRepository(db)
	subRepo := subscriptions.NewRepository(db)
	payRepo := payments.NewRepository(db)
	auditRepo := audit.NewRepository(db)

	planSvc := plans.NewService(planRepo)
	subSvc := subscriptions.NewService(subRepo, planRepo, fxClient, notifClient)
	paySvc := payments.NewService(payRepo)
	auditSvc := audit.NewService(auditRepo)

	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "50053"
	}

	listener, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("error listening on port %s: %v", port, err)
	}

	grpcServer := grpc.NewServer()
	healthpb.RegisterHealthServer(grpcServer, &grpcHealthServer{db: db})

	pb.RegisterSubscriptionServiceServer(grpcServer, &subscriptionServer{
		plansHandler:    plans.NewHandler(planSvc, fxClient),
		subsHandler:     subscriptions.NewHandler(subSvc),
		paymentsHandler: payments.NewHandler(paySvc),
		auditHandler:    audit.NewHandler(auditSvc),
	})

	log.Printf("Subscription Service listening on :%s", port)
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("error serving gRPC: %v", err)
	}
}
