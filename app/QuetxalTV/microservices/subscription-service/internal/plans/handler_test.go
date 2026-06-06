package plans

import (
	"context"
	"testing"

	"subscription-service/internal/clients"
	pb "subscription-service/proto/subscription"
)

type fakePlanService struct {
	plans []Plan
	plan  *Plan
}

func (s fakePlanService) GetAllPlans(context.Context) ([]Plan, error) {
	return s.plans, nil
}

func (s fakePlanService) GetPlanByID(context.Context, string) (*Plan, error) {
	return s.plan, nil
}

func TestGetPlansWithRatesUsesUSDFallbackClient(t *testing.T) {
	handler := NewHandler(fakePlanService{plans: []Plan{{ID: "plan-1", Name: "Basic", PriceUSD: 5.99, MaxProfiles: 1, MaxStreams: 1, VideoQuality: "SD", IsActive: true}}}, clients.NewFallbackFXClient())

	resp, err := handler.GetPlansWithRates(context.Background(), &pb.GetPlansWithRatesRequest{Currency: "GTQ"})
	if err != nil {
		t.Fatalf("GetPlansWithRates returned error: %v", err)
	}
	if resp.Currency != "GTQ" {
		t.Fatalf("expected requested currency, got %s", resp.Currency)
	}
	if len(resp.Plans) != 1 || resp.Plans[0].LocalPrice != 5.99 || resp.Plans[0].ExchangeRate != 1 {
		t.Fatalf("unexpected plans with rates: %#v", resp.Plans)
	}
}

func TestGetPlansMapsDomainPlansToProto(t *testing.T) {
	handler := NewHandler(fakePlanService{plans: []Plan{{ID: "plan-1", Name: "Premium", Description: "4K", PriceUSD: 15.99, MaxProfiles: 5, MaxStreams: 4, VideoQuality: "4K", IsActive: true}}}, clients.NewFallbackFXClient())

	resp, err := handler.GetPlans(context.Background(), &pb.GetPlansRequest{})
	if err != nil {
		t.Fatalf("GetPlans returned error: %v", err)
	}
	if len(resp.Plans) != 1 {
		t.Fatalf("expected one plan, got %d", len(resp.Plans))
	}
	if resp.Plans[0].Name != "Premium" || resp.Plans[0].MaxProfiles != 5 {
		t.Fatalf("unexpected mapped plan: %#v", resp.Plans[0])
	}
}
