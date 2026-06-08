package payments

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	pb "subscription-service/proto/subscription"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetPaymentHistory(ctx context.Context, req *pb.GetPaymentHistoryRequest) (*pb.GetPaymentHistoryResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	items, total, err := h.service.GetPaymentHistory(ctx, req.GetUserId(), int(req.GetLimit()), int(req.GetOffset()))
	if err != nil {
		return nil, err
	}

	payments := make([]*pb.Payment, 0, len(items))
	for _, p := range items {
		payments = append(payments, &pb.Payment{
			Id:             p.ID,
			SubscriptionId: p.SubscriptionID,
			PlanName:       p.PlanName,
			AmountUsd:      p.AmountUSD,
			AmountLocal:    p.AmountLocal,
			Currency:       p.Currency,
			ExchangeRate:   p.ExchangeRate,
			Status:         p.Status,
			PaymentMethod:  p.PaymentMethod,
			TransactionRef: p.TransactionRef,
			CreatedAt:      p.CreatedAt,
		})
	}

	return &pb.GetPaymentHistoryResponse{Payments: payments, Total: int32(total)}, nil
}
