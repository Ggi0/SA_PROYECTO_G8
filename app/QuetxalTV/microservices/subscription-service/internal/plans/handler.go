package plans

import (
	"context"
	"math"

	"subscription-service/internal/clients"
	pb "subscription-service/proto/subscription"
)

type Handler struct {
	service  Service
	fxClient clients.FXClient
}

func NewHandler(service Service, fxClient clients.FXClient) *Handler {
	if fxClient == nil {
		fxClient = clients.NewFallbackFXClient()
	}
	return &Handler{service: service, fxClient: fxClient}
}

func (h *Handler) GetPlans(ctx context.Context, _ *pb.GetPlansRequest) (*pb.GetPlansResponse, error) {
	plans, err := h.service.GetAllPlans(ctx)
	if err != nil {
		return nil, err
	}

	pbPlans := make([]*pb.Plan, 0, len(plans))
	for _, p := range plans {
		pbPlans = append(pbPlans, toProto(p))
	}
	return &pb.GetPlansResponse{Plans: pbPlans}, nil
}

func (h *Handler) GetPlanById(ctx context.Context, req *pb.GetPlanByIdRequest) (*pb.Plan, error) {
	plan, err := h.service.GetPlanByID(ctx, req.GetPlanId())
	if err != nil {
		return nil, err
	}
	return toProto(*plan), nil
}

func (h *Handler) GetPlansWithRates(ctx context.Context, req *pb.GetPlansWithRatesRequest) (*pb.GetPlansWithRatesResponse, error) {
	plans, err := h.service.GetAllPlans(ctx)
	if err != nil {
		return nil, err
	}

	currency := req.GetCurrency()
	if currency == "" {
		currency = "USD"
	}

	rate, err := h.fxClient.GetExchangeRate(ctx, "USD", currency)
	if err != nil {
		rate = 1
		currency = "USD"
	}

	items := make([]*pb.PlanWithRate, 0, len(plans))
	for _, p := range plans {
		items = append(items, &pb.PlanWithRate{
			Plan:         toProto(p),
			LocalPrice:   math.Round(p.PriceUSD*rate*100) / 100,
			Currency:     currency,
			ExchangeRate: rate,
		})
	}

	return &pb.GetPlansWithRatesResponse{Plans: items, Currency: currency}, nil
}

func toProto(p Plan) *pb.Plan {
	return &pb.Plan{
		Id:           p.ID,
		Name:         p.Name,
		Description:  p.Description,
		PriceUsd:     p.PriceUSD,
		MaxProfiles:  p.MaxProfiles,
		MaxStreams:   p.MaxStreams,
		VideoQuality: p.VideoQuality,
		IsActive:     p.IsActive,
	}
}
