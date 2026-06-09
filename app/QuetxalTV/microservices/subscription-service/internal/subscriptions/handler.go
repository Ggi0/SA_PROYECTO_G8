package subscriptions

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

func (h *Handler) Subscribe(ctx context.Context, req *pb.SubscribeRequest) (*pb.SubscribeResponse, error) {
	if req.GetUserId() == "" || req.GetPlanId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id and plan_id are required")
	}

	result, err := h.service.Subscribe(ctx, req.GetUserId(), req.GetPlanId(), req.GetCurrency(), req.GetPaymentMethod())
	if err != nil {
		return &pb.SubscribeResponse{Success: false, Message: err.Error()}, nil
	}

	return &pb.SubscribeResponse{
		Success:        true,
		SubscriptionId: result.SubscriptionID,
		PaymentId:      result.PaymentID,
		Message:        "Subscription activated successfully",
	}, nil
}

func (h *Handler) CancelSubscription(ctx context.Context, req *pb.CancelSubscriptionRequest) (*pb.CancelSubscriptionResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	if err := h.service.Cancel(ctx, req.GetUserId(), req.GetReason()); err != nil {
		return &pb.CancelSubscriptionResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.CancelSubscriptionResponse{Success: true, Message: "Subscription cancelled successfully"}, nil
}

func (h *Handler) GetUserSubscription(ctx context.Context, req *pb.GetUserSubscriptionRequest) (*pb.UserSubscriptionResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	sub, hasActive, err := h.service.GetUserSubscription(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "subscription lookup failed: %v", err)
	}
	if !hasActive {
		return &pb.UserSubscriptionResponse{HasActiveSubscription: false}, nil
	}

	return &pb.UserSubscriptionResponse{
		HasActiveSubscription: true,
		SubscriptionId:        sub.ID,
		PlanId:                sub.PlanID,
		PlanName:              sub.PlanName,
		PlanPriceUsd:          sub.PlanPriceUSD,
		Status:                sub.Status,
		StartDate:             sub.StartDate,
		RenewalDate:           sub.RenewalDate,
		DaysRemaining:         sub.DaysRemaining,
		MaxProfiles:           sub.MaxProfiles,
		MaxStreams:            sub.MaxStreams,
		VideoQuality:          sub.VideoQuality,
	}, nil
}
